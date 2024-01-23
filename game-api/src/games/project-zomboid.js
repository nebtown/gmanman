const { debugLog, connectUrl } = require("../cliArgs");
const { dockerComposeStop, gamedigQueryPlayers } = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class ProjectZomboidManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:16261"}`;
	}
	async stop() {
		try {
			await this.rcon("quit");
		} catch (e) {
			console.log("stop rcon error:", e);
		}
		return dockerComposeStop();
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "projectzomboid",
			port: 16261,
			socketTimeout: 4000,
		});
	}
};
