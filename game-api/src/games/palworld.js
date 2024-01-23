const path = require("path");
const { debugLog, connectUrl } = require("../cliArgs");
const { dockerComposeStop, dockerComposeExec } = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class PalworldManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:8211"}`;
	}
	async stop() {
		return dockerComposeStop();
	}
	async getPlayers() {
		try {
			const res = await dockerComposeExec("palworld", "rcon-cli showplayers");
			const playerData = res.out
				.replace("Weird. This response is for another request.\n", "")
				.replace("name,playeruid,steamid\n", "")
				.replaceAll("\x1B[0m", "")
				.trim();
			if (!playerData) {
				return [];
			}
			return playerData.split("\n").map((row) => ({ name: row.split(",")[0] }));
		} catch (e) {
			console.log("getPlayers error:", e.err);
			return false;
		}
	}
	async filesToBackup() {
		return [
			path.join("palworld", "Pal", "Saved", "SaveGames"),
			path.join("palworld", "Pal", "Saved", "Config", "LinuxServer"),
		];
	}
};
