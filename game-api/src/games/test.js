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
		return (
			this.getCurrentStatus() === "starting" ||
			this.getCurrentStatus() === "running"
		);
	}
	async getPlayerCount() {
		if (this.getCurrentStatus() === "starting") {
			this.setStatus("running");
		}
		if (this.getCurrentStatus() === "running") {
			return 0;
		}
		return false;
	}
	async logs() {
		return this.logData;
	}
	update() {
		setTimeout(() => {
			this.setStatus("stopped");
		}, 2000);
	}
	getMods() {
		return [{ id: "a-mod", enabled: true }];
	}
	setMods(modsList) {}
	filesToBackup() {
		return [path.join(gameDir, "file1.txt"), path.join(gameDir, "dir1")];
	}
};
