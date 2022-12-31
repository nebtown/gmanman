const Gamedig = require("gamedig");
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
		const allModsById = await this.getModListById();
		const enabledModsRaw = await readEnvFileCsv("MODS");
		const disabledModsRaw = await readEnvFileCsv("MODS_OFF");

		return [
			...enabledModsRaw,
			...disabledModsRaw.filter((url) => !enabledModsRaw.includes(url)),
		].map((url) => {
			const match = reDownloadUrl1.exec(url) || reDownloadUrl2.exec(url) || [];
			const id = `${match[1]}-${match[2]}`;
			const version = match[3];

			return {
				id,
				enabled: enabledModsRaw.includes(url),
				href: `${allModsById[id]?.href}#currentVersion=${version}`,
				version,
				outdated: version !== (allModsById[id]?.latestVersion || version),
			};
		});
	}
	async setMods(modsList) {
		const allModsById = await this.getModListById();
		const modsString = modsList
			.filter(({ enabled }) => enabled)
			.map(({ id }) => allModsById[id].downloadUrl)
			.join(",\n");
		const modsStringDisabled = modsList
			.filter(({ enabled }) => !enabled)
			.map(({ id }) => allModsById[id].downloadUrl)
			.join(",\n");

		await writeEnvFile({
			MODS: modsString,
			MODS_OFF: modsStringDisabled,
		});
		return true;
	}

	async getModList() {
		if (!this.cachedModList || this.cachedModListExpiry < Date.now()) {
			const { data } = await axios.get(
				`https://thunderstore.io/c/${game}/api/v1/package/`
			);
			this.cachedModList = data
				.map(({ name, full_name, package_url, versions }) => ({
					id: full_name,
					label: name,
					href: package_url,
					downloadUrl: versions[0].download_url,
					latestVersion: versions[0].version_number,
					downloads: versions
						.slice(0, 5)
						.reduce((sum, row) => sum + row.downloads, 0),
				}))
				.sort((a, b) => b.downloads - a.downloads);
			this.cachedModListExpiry = Date.now() + 60 * 60 * 1000;
		}
		return this.cachedModList;
	}
	async getModListById() {
		return (await this.getModList()).reduce((carry, row) => {
			carry[row.id] = row;
			return carry;
		}, {});
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
		if (!(await fs.exists(`${gameDir}docker-compose.yml`))) {
			await fse.copy(
				path.join(__dirname, `../../../game-setups/${game}`),
				gameDir,
				{
					overwrite: false,
				}
			);
		}
		if (!(await fs.exists(`${gameDir}.env`))) {
			await fs.writeFile(`${gameDir}.env`, "");
		}
		await writeEnvFile({
			API_ID: gameId,
			API_NAME: gameName,
			GAMEPASSWORD: gamePassword,
			SAVENAME: saveName,
			GAMEPORT: gamePort,
			RCONPORT: rconPort,
			EXTRAPORT: gamePort + 2,
		});
	}
};
