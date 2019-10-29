const { debugLog } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogs,
	rconConnect,
} = require("./common-helpers");

module.exports = class MinecraftManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
	}
	start() {
		return dockerComposeStart();
	}
	stop() {
		return dockerComposeStop();
	}
	isProcessRunning() {
		return dockerIsProcessRunning();
	}
	async getPlayerCount() {
		let playerList;
		try {
			playerList = await (await rconConnect(27075)).send("list");
		} catch (e) {
			debugLog("rcon", e.message);
			return false;
		}
		const matches = playerList.match(
			/There are (\d+) of a max \d+ players online:/
		);
		if (!matches) {
			console.warn("playerList: ", playerList);
			return false;
		}
		return Number(matches[1]);
	}
	async logs() {
		const logs = await dockerLogs();
		return logs.replace(/^(.*?)\[/gm, "["); // trim colour codes
	}
};
