const GenericDockerManager = require("./docker");

// todo: docker image may need an additional init step to prepare a world

module.exports = class TerrariaManager extends GenericDockerManager {
	async filesToBackup() {
		return ["config", ".env"];
	}
};
