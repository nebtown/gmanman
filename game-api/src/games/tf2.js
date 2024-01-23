const { steamWorkshopGetModSearch } = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class TF2Manager extends GenericDockerManager {
	constructor({ getCurrentStatus, setStatus }) {
		super({ getCurrentStatus, setStatus });
		this.APPID = 440;
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "teamfortress2",
		});
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
};
