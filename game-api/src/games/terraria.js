const GenericDockerManager = require("./docker");
const { gamedigQueryPlayers } = require("./common-helpers");

// todo: ideally pass world gen settings into the docker-compose.yml entrypoint

module.exports = class TerrariaManager extends GenericDockerManager {
	async filesToBackup() {
		return ["config", ".env"];
	}
	async getPlayers() {
		// todo: not working yet, some sort of token needed? https://github.com/gamedig/node-gamedig/issues/529
		return await gamedigQueryPlayers({
			type: "terrariatshock",
			socketTimeout: 4000,
			givenPortOnly: true,
			debug: true,
		});
	}
};
