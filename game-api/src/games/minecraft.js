const { debugLog } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogs,
	rconConnect,
} = require("./common-helpers");

module.exports = class MinecraftManager {
	constructor({ dir, getCurrentStatus, setStatus }) {
		this.dir = dir
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

	async backup(backupFileName) {
        // Stop autosaving.
        await (await rconConnect(27075)).send("save-off");

        // Trigger save.
        await (await rconConnect(27075)).send("save-all");

        // List files in gameDir.
        const gameFiles = fsPromises.readdir(this.gameDir);

	    // TODO Filter out known non-data files.

	    // Create archive.
	    await archives.makeBackup(
            backupFileName,
            this.gameDir,
            gameFiles
        );

	    // Re-enable autosaving.
        await (await rconConnect(27075)).send("save-on");

	    // Upload archive.
	    await gcs.uploadFile(game, backupFileName);
	}
};
