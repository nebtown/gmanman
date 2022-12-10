const Gamedig = require("gamedig");

const { game, gameId, debugLog, connectUrl, rconPort } = require("../cliArgs");
const { dockerComposePull, gamedigQueryPlayers } = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class ValheimManager extends GenericDockerManager {
	getConnectUrl() {
		return connectUrl;
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "valheim", // Gamedig lacks Valheim but css is compatible
			socketTimeout: 4000,
		});
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
	async filesToBackup() {
		return ["saves"];
	}
};
