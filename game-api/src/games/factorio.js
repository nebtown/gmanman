const fsPromises = require("../libjunkdrawer/fsPromises");
const path = require("path");
const stripAnsi = require("strip-ansi");
const axios = require("axios");
const docker = new (require("dockerode"))();

const { jsonPretty } = require("../libjunkdrawer/jsonPretty");
const { gameId, gameDir, debugLog, connectUrl } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogRead,
	rconConnect,
} = require("./common-helpers");

module.exports = class FactorioManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
	}
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:34197"}`;
	}
	start() {
		return dockerComposeStart();
	}
	stop() {
		return dockerComposeStop();
	}
	isProcessRunning() {
		return dockerIsProcessRunning();
	}
	async getPlayers() {
		let playerList;
		try {
			playerList = await (await rconConnect(34198)).send("/players online");
		} catch (e) {
			debugLog("rcon", e.message);
			return false;
		}
		const matches = playerList.match(/Online players \((\d+)\):/);
		if (!matches) {
			console.warn("unexpected playerList:", playerList);
			return false;
		}
		const playerCount = Number(matches[1]);
		if (playerCount > 0) {
			return playerList
				.split("\n")
				.slice(1)
				.map((line) => {
					const lineMatch = line.match(/  (.*) \(online\)/);
					if (lineMatch) {
						return { name: lineMatch[1] };
					}
					return false;
				})
				.filter(Boolean);
		}
		return [...new Array(playerCount)].map((_) => ({}));
	}
	async logs(requestedOffset) {
		const { logs, offset } = await dockerLogRead(requestedOffset);
		return {
			logs:
				this.getCurrentStatus() === "updating"
					? logs
					: stripAnsi(logs.replace(/^(.{8})/gm, "")),
			offset,
		};
	}
	update() {
		docker.pull("factoriotools/factorio");
		docker
			.run("factoriotools/factorio", [], [], {
				name: gameId,
				Entrypoint: ["./docker-update-mods.sh"],
				HostConfig: {
					Binds: [`${gameDir}volume:/factorio`],
					AutoRemove: true,
				},
			})
			.then(() => {
				this.setStatus("stopped");
			});
	}
	async getMods() {
		try {
			const modListText = await fsPromises.readFile(
				path.join(gameDir, "volume", "mods", "mod-list.json")
			);
			return JSON.parse(modListText)
				.mods.filter(({ name }) => name !== "base")
				.map(({ name, enabled }) => ({
					id: name,
					enabled,
				}));
		} catch (e) {
			console.error("getMods error: ", e);
			return [];
		}
	}
	async setMods(modsList) {
		try {
			await fsPromises.writeFile(
				path.join(gameDir, "volume", "mods", "mod-list.json"),
				jsonPretty({
					mods: [...modsList, { id: "base", enabled: true }].map(
						({ id, enabled }) => ({
							name: id,
							enabled,
						})
					),
				})
			);
			return true;
		} catch (e) {
			console.error("setMods error: ", e);
			return false;
		}
	}
	async getModList() {
		if (!this.cachedModList) {
			const { data } = await axios.get(
				"https://mods.factorio.com/api/mods?page_size=max"
			);
			this.cachedModList = data.results
				.sort((a, b) => b.downloads_count - a.downloads_count)
				.map(({ name, title, summary, downloads_count }) => ({
					id: name,
					label: title,
				}));
		}
		return this.cachedModList;
	}
	async getModSearch(query) {
		query = query.toLowerCase();
		return (await this.getModList()).filter(
			({ id, label }) =>
				id.toLowerCase().includes(query) || label.toLowerCase().includes(query)
		);
	}
	async filesToBackup() {
		const saves = (
			await Promise.all(
				(
					await fsPromises.readdir(path.join("volume", "saves"))
				).map(async (v) => ({
					name: v,
					time: (
						await fsPromises.stat(path.join("volume", "saves", v))
					).mtime.getTime(),
				}))
			)
		).sort((a, b) => -(a.time - b.time));

		return [
			path.join("volume", "saves", saves[0].name),
			path.join("volume", "config"),
			path.join("volume", "mods", "mod-list.json"),
			path.join("volume", "mods", "mod-settings.dat"),
		];
	}
};
