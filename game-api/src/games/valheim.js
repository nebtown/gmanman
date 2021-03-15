const Gamedig = require("gamedig");

const { game, gameId, debugLog, connectUrl, rconPort } = require("../cliArgs");
const { dockerComposePull, gamedigQueryPlayers } = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class ValheimManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl} (though use Steam Server browser)`;
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "css", // Gamedig lacks Valheim but css is compatible
			socketTimeout: 4000,
		});
	}
	async update() {
		dockerComposePull()
			.then(res => {
				console.log("finished docker pull: ", res);
				this.setStatus("stopped");
			})
			.catch(e => {
				console.log("docker pull failed:", e);
			});
	}
	async filesToBackup() {
		return ["saves"];
	}
};
