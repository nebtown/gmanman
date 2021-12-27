const { rconPort, debugLog, connectUrl } = require("../cliArgs");
const {
	dockerComposeStop,
	gamedigQueryPlayers,
	rconConnect,
} = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class ProjectZomboidManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:16261"}`;
	}
	async stop() {
		try {
			const response = await (await rconConnect(rconPort || '27015')).send("quit");
			debugLog("Stop rcon response:", response);
		} catch (e) {
			console.log("stop rcon error:", e);
		}
		return dockerComposeStop();
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "css", // Gamedig lacks zomboid but css is compatible
			port: 16261,
			socketTimeout: 4000,
		});
	}
};
