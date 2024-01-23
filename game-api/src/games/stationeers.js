const { debugLog, connectUrl } = require("../cliArgs");
const { gamedigQueryPlayers } = require("./common-helpers");
const GenericDockerManager = require("./docker");
let { gamePort, rconPort } = require("../cliArgs");

if (!rconPort) rconPort = gamePort + 1;
module.exports = class StationeersManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:27015"}`;
	}
	getRconPort() {
		return rconPort;
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "css", // Gamedig lacks support but css may be compatible
			// port: 16261,
			socketTimeout: 4000,
		});
	}
};
