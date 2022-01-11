const axios = require("axios");
const GenericDockerManager = require("./docker");
const { debugLog } = require("../cliArgs");

module.exports = class KSPManager extends GenericDockerManager {
	async getPlayers() {
		try {
			const { data } = await axios.get(
				"http://localhost:8900"
			);
			return data[0].CurrentState.CurrentPlayers.map((name) => ({name}));
		} catch (e) {
			debugLog("ksp getPlayers error", e);
			return false;
		}
	}
};
