const fs = require("fs");
const path = require("path");

const { gameDir, debugLog } = require("../cliArgs");

module.exports = class TestManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
		this.logData = "";
	}
	start() {
		this.logData += "\n\n\nLaunching...\n";
	}
	stop() {
		this.logData += "Stopping...\n";
	}
	async isProcessRunning() {
		return false;
	}
	async getPlayerCount() {
		return false;
	}
	async logs() {
		return this.logData;
	}
	update() {}
	getMods() {
		return [{ id: "a-mod", enabled: true }];
	}
	setMods(modsList) {}
	filesToBackup() {
		return [path.join(gameDir, "file1.txt"), path.join(gameDir, "dir1")];
	}
};
