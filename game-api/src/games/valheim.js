const path = require("path");
const axios = require("axios");

const {
	game,
	gameId,
	debugLog,
	connectUrl,
	gameDir,
	gameName,
	saveName,
	gamePassword,
} = require("../cliArgs");
let { gamePort, rconPort } = require("../cliArgs");

if (!gamePort) gamePort = 2456;
if (!rconPort) rconPort = gamePort + 1;

const {
	dockerComposePull,
	gamedigQueryPlayers,
	readEnvFileCsv,
	writeEnvFile,
} = require("./common-helpers");
const GenericDockerManager = require("./docker");
const fs = require("../libjunkdrawer/fsPromises");
const fse = require("fs-extra");

const reDownloadUrl1 = /package\/download\/([^\/]+)\/([^\/]+)\/([^\/]+)\//;
const reDownloadUrl2 =
	/repository\/packages\/([^\/\-]+)\-([^\/\-]+)\-([^\-]+)\.zip/;

// Thunderstore-compatible mod repos, in order of preference: Hexium is newer and
// carries far fewer mods, but the ones it does carry are the better maintained
// builds, so it wins whenever both list a mod.
const modRepos = [
	{
		source: "hexium",
		packageListUrl: `https://hexium.gg/c/${game}/api/v1/package/`,
		// Hexium serves opaque cdn urls (/upload/<id>/<version>.zip) that the
		// regexes above can't read, so installed mods are matched by url instead
		indexVersionUrls: true,
	},
	{
		source: "thunderstore",
		packageListUrl: `https://thunderstore.io/c/${game}/api/v1/package/`,
	},
];
const modListCacheMs = 60 * 60 * 1000;
const modListRetryMs = 5 * 60 * 1000;
module.exports = class ValheimManager extends GenericDockerManager {
	updateOnStart = true;
	getConnectUrl() {
		return connectUrl;
	}
	getRconPort() {
		return rconPort;
	}
	oldGetPlayersResult = false;
	async getPlayers() {
		const lookupPromise = gamedigQueryPlayers({
			type: "valheim",
			socketTimeout: 4000,
			port: rconPort,
		}).then((result) => {
			this.oldGetPlayersResult = result;
			return result;
		});

		const timeoutPromise = new Promise((resolve, reject) =>
			setTimeout(() => resolve(this.oldGetPlayersResult), 800)
		);

		return await Promise.race([lookupPromise, timeoutPromise]);
	}
	update = false; // updates on boot
	/*async update() {
		dockerComposePull()
			.then(res => {
				console.log("finished docker pull: ", res);
				this.setStatus("stopped");
			})
			.catch(e => {
				console.log("docker pull failed:", e);
			});
	}*/

	async getMods() {
		const { modsById, modsByDownloadUrl } = await this.getRepoData();

		return (await this.getInstalledMods(modsByDownloadUrl)).map(
			({ id, version, enabled }) => {
				const mod = modsById[id];
				return {
					id,
					label: mod?.label,
					source: mod?.source,
					enabled,
					href: mod?.href && `${mod.href}#currentVersion=${version}`,
					version,
					outdated: version !== (mod?.latestVersion || version),
				};
			}
		);
	}
	async setMods(modsList) {
		const { modsById, modsByDownloadUrl } = await this.getRepoData();
		const installedUrlsById = {};
		for (const { id, url } of await this.getInstalledMods(modsByDownloadUrl)) {
			installedUrlsById[id] = url;
		}
		// Resolving serverside means a mod present in both repos moves to the
		// preferred one on the next save. Falling back to the url that's already
		// installed keeps a mod both repos have since dropped from silently
		// vanishing when something unrelated is toggled.
		const downloadUrl = ({ id }) =>
			modsById[id]?.downloadUrl || installedUrlsById[id];

		const unresolved = modsList.filter((mod) => !downloadUrl(mod));
		if (unresolved.length) {
			console.warn(
				`setMods: no download url known for ${unresolved
					.map(({ id }) => id)
					.join(", ")}, dropping`
			);
		}
		const urlsFor = (wantEnabled) =>
			modsList
				.filter(({ enabled }) => !!enabled === wantEnabled)
				.map(downloadUrl)
				.filter(Boolean)
				.join(",\n");

		await writeEnvFile({
			MODS: urlsFor(true),
			MODS_OFF: urlsFor(false),
		});
		return true;
	}

	/**
	 * .env only stores download urls, so installed mods are identified by
	 * matching those against the urls the repos advertise. Thunderstore's urls
	 * also spell out owner/name/version, so the regexes stay as a fallback for
	 * mods no repo lists any more.
	 */
	async getInstalledMods(modsByDownloadUrl) {
		const enabledUrls = await readEnvFileCsv("MODS");
		const disabledUrls = await readEnvFileCsv("MODS_OFF");

		return [
			...enabledUrls,
			...disabledUrls.filter((url) => !enabledUrls.includes(url)),
		].map((rawUrl) => {
			// readEnvFileCsv splits on the "," of the ",\n" separator written above
			const url = rawUrl.trim();
			const known = modsByDownloadUrl[url];
			const match = reDownloadUrl1.exec(url) || reDownloadUrl2.exec(url);

			return {
				url,
				enabled: enabledUrls.includes(rawUrl),
				// showing the raw url beats "undefined-undefined" for a mod that's
				// neither listed nor parseable - it can still be seen and removed
				id: known?.id || (match ? `${match[1]}-${match[2]}` : url),
				version: known?.version || match?.[3],
			};
		});
	}

	/**
	 * Mods merged across every repo in `modRepos`, keyed by package id, plus the
	 * download url index getInstalledMods needs. Earlier repos win, so a mod
	 * carried by both is served from the preferred one.
	 */
	async getRepoData() {
		if (!this.cachedRepoData || this.cachedRepoDataExpiry < Date.now()) {
			const repoResults = await Promise.all(
				modRepos.map((repo) => this.fetchRepoPackages(repo))
			);

			const modsById = {};
			const modsByDownloadUrl = {};
			for (const { mods, versionUrls } of repoResults) {
				for (const mod of mods) {
					const winner = modsById[mod.id];
					if (winner) {
						// A preferred repo already claimed this mod, but keep the best
						// download count either reports - a newer repo's lower counts
						// would otherwise sink popular mods to the bottom of the list.
						winner.downloads = Math.max(winner.downloads, mod.downloads);
					} else {
						modsById[mod.id] = mod;
					}
				}
				// indexed for every repo, not just the winners: a mod installed from
				// the losing repo still has to resolve back to a name and version
				Object.assign(modsByDownloadUrl, versionUrls);
			}

			this.cachedRepoData = {
				modsById,
				modsByDownloadUrl,
				modList: Object.values(modsById).sort(
					(a, b) => b.downloads - a.downloads
				),
			};
			// don't sit on a repo's stale/missing mods for the full hour
			this.cachedRepoDataExpiry =
				Date.now() +
				(repoResults.some(({ failed }) => failed)
					? modListRetryMs
					: modListCacheMs);
		}
		return this.cachedRepoData;
	}
	cachedRepoPackages = {};
	async fetchRepoPackages({ source, packageListUrl, indexVersionUrls }) {
		try {
			const { data } = await axios.get(packageListUrl);

			const mods = [];
			const versionUrls = {};
			for (const { name, full_name, package_url, versions } of data) {
				mods.push({
					id: full_name,
					label: name,
					source,
					href: package_url,
					downloadUrl: versions[0].download_url,
					latestVersion: versions[0].version_number,
					downloads: versions
						.slice(0, 5)
						.reduce((sum, row) => sum + row.downloads, 0),
				});
				if (indexVersionUrls) {
					for (const { download_url, version_number } of versions) {
						versionUrls[download_url] = {
							id: full_name,
							version: version_number,
						};
					}
				}
			}

			this.cachedRepoPackages[source] = { mods, versionUrls };
			return { mods, versionUrls, failed: false };
		} catch (err) {
			// one repo being down shouldn't blank the other's mods
			console.warn(`Failed to fetch ${source} mod list: ${err.message}`);
			return {
				mods: [],
				versionUrls: {},
				...this.cachedRepoPackages[source],
				failed: true,
			};
		}
	}

	async getModList() {
		return (await this.getRepoData()).modList;
	}

	async getModSearch(query) {
		query = query.toLowerCase();
		return (await this.getModList()).filter(({ id, label }) =>
			`${id} ${label}`.toLowerCase().includes(query)
		);
	}

	async filesToBackup() {
		return ["saves", "server/BepInEx/config", ".env"];
	}

	/**
	 * Copies mod files to be saved in the modPack.7z into a temporary directory.
	 * Valheim's assumes the presense of a gmanman/game-setups/valheim/modpack-base/ containing the latest Windows binaries for BepInEx
	 */
	async prepareModPackTempDir(packTempPath) {
		const archiveRootPath = `${packTempPath}/Valheim`;

		await fse.copy(
			path.join(__dirname, `../../../game-setups/${game}/modpack-base`),
			archiveRootPath
		);
		await fse.copy(
			path.join(gameDir, "server/BepInEx/config"),
			path.join(archiveRootPath, "BepInEx/config")
		);
		await fse.copy(
			path.join(gameDir, "server/BepInEx/plugins"),
			path.join(archiveRootPath, "BepInEx/plugins")
		);
		return archiveRootPath;
	}
	async getModPackHash() {
		return (
			await fs.spawnProcess("bash", [
				"-c",
				`cd ${gameDir} && find server/BepInEx/{config,plugins} -type f -exec md5sum {} \\; | sort -k 2 | md5sum | cut -d ' ' -f1`,
			])
		).trim();
	}

	async setupInstanceFiles() {
		await super.setupInstanceFiles();
		await writeEnvFile({
			EXTRAPORT: gamePort + 2,
		});
	}
};
