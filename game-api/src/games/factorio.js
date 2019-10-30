const fs = require("fs");
const path = require("path");
const stripAnsi = require("strip-ansi");
const axios = require("axios");
const docker = new (require("dockerode"))();

const { gameDir, debugLog, connectUrl } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogs,
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
	async getPlayerCount() {
		let playerList;
		try {
			playerList = await (await rconConnect(34198)).send("/players");
		} catch (e) {
			debugLog("rcon", e.message);
			return false;
		}
		const matches = playerList.match(/Players \((\d+)\):/);
		if (!matches) {
			console.warn("playerList: ", playerList);
			return false;
		}
		return Number(matches[1]);
	}
	async logs() {
		const logs = await dockerLogs();
		if (this.getCurrentStatus() === "updating") {
			return logs;
		}
		return stripAnsi(logs.replace(/^(.{8})/gm, ""));
	}
	update() {
		docker.pull("factoriotools/factorio");
		docker
			.run("factoriotools/factorio", [], [], {
				name: "factorio",
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
	getMods() {
		try {
			const modListText = fs.readFileSync(
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
	setMods(modsList) {
		try {
			fs.writeFileSync(
				path.join(gameDir, "volume", "mods", "mod-list.json"),
				JSON.stringify({
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
	filesToBackup() {
		return [
			path.join(gameDir, "volume", "saves"),
			path.join(gameDir, "volume", "config"),
			path.join(gameDir, "volume", "mods", "mod-list.json"),
			path.join(gameDir, "volume", "mods", "mod-settings.dat"),
		];
	}
};
