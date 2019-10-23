const { debugLog } = require("./cliArgs");
const CommonDockerGameManager = require("./common-docker-game-manager");

module.exports = class MinecraftManager extends CommonDockerGameManager {
	async getPlayerCount() {
		let playerList;
		try {
			playerList = await (await this.rconConnect(27075)).send("list");
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
		const logs = await super.logs();
		return logs.replace(/^(.*?)\[/gm, "["); // trim colour codes
	}
};
