const path = require("path");
const axios = require("axios");

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
	async getMods() {
		if (!this.currentMods) {
			this.currentMods = [{ id: "honk", enabled: true }];
		}
		return this.currentMods;
	}
	async setMods(modsList) {
		this.currentMods = modsList;
		return true;
	}
	async getModList() {
		return [
			{ id: "bob-mod-1", label: "Bob's Aircraft Mod 1" },
			{ id: "bob-mod-2", label: "Bob's Mod 2" },
			{ id: "honk", label: "HONK HONK" },
			{ id: "angel 4", label: "Angel Crazy mod" },
		];
	}
	async getModSearch(query) {
		query = query.toLowerCase();
		return (await this.getModList()).filter(
			({ id, label }) =>
				id.toLowerCase().includes(query) || label.toLowerCase().includes(query)
		);
	}
	filesToBackup() {
		return [path.join(gameDir, "file1.txt"), path.join(gameDir, "dir1")];
	}
};
