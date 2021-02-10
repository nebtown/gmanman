const stripAnsi = require("strip-ansi");
const Gamedig = require("gamedig");
const compose = require("docker-compose");

const { game, gameId, debugLog, connectUrl, rconPort } = require("../cliArgs");
const { dockerComposeStop, dockerComposePull } = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class ValheimManager extends GenericDockerManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl} (though use Steam Server browser)`;
	}
	stop() {
		// just docker-compose stop doesn't seem to shutdown cleanly (saving)...
		compose
			.exec(game, "bash -c 'cd /home/steam/valheim && ~steam/.odin/odin/stop")
			.then(() => {
				dockerComposeStop();
			});
	}
	async getPlayerCount() {
		try {
			const response = await Gamedig.query({
				type: "css", // Gamedig lacks Valheim but css is compatible
				host: `localhost`,
				port: rconPort,
				socketTimeout: 3000,
			});
			return response.players.length;
		} catch (err) {
			debugLog(`getPlayerCount err: ${err}`);
			return false;
		}
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
