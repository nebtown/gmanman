const { debugLog, connectUrl } = require("../cliArgs");
const {
	dockerLogRead,
	gamedigQueryPlayers,
} = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class BarotraumaManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:27015"}`;
	}
	async getPlayers() {
		const { logs, offset } = await dockerLogRead(-15000);

		const joins = [...(logs.matchAll(/  (.*?) has joined the server\./g) || [])];
		const leaves = [...(logs.matchAll(/  (.*?) has left the server\./g) || [])];
		const players = {};
		for (let match of joins) {
			const name = match[1].trim();
			players[name] = (players[name] || 0) + 1;
		}
		for (let match of leaves) {
			const name = match[1].trim();
			players[name] = (players[name] || 0) - 1;
			if (players[name] <= 0) {
				delete players[name];
			}
		}

		if (joins.length || leaves.length) {
			return Object.keys(players).map((name) => ({name}));
		}

		if (logs.includes("Server started")) {
			return []
		}
		// else it hasn't started
		return false;
	}
};
