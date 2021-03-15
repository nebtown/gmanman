const stripAnsi = require("strip-ansi");
const Gamedig = require("gamedig");

const { gameId, debugLog, connectUrl, rconPort } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerComposeBuild,
	dockerIsProcessRunning,
	dockerLogRead,
	rconSRCDSConnect,
	steamWorkshopGetModSearch,
} = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class TF2Manager extends GenericDockerManager {
	constructor({ getCurrentStatus, setStatus }) {
		super({ getCurrentStatus, setStatus });
		this.APPID = 440;
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
};
