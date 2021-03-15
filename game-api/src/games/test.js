const path = require("path");
const axios = require("axios");

const { gameDir, debugLog } = require("../cliArgs");

module.exports = class TestManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
		this.logData = [];
	}
	start() {
		this.logData.push("\n", "\n", "\n", "Launching...");
	}
	stop() {
		this.logData.push("Stopping...");
	}
	async isProcessRunning() {
		return (
			this.getCurrentStatus() === "starting" ||
			this.getCurrentStatus() === "running"
		);
	}
	async getPlayers() {
		if (this.getCurrentStatus() === "starting") {
			this.setStatus("running");
		}
		if (this.getCurrentStatus() === "running") {
			return [];
		}
		return false;
	}
	async logs(requestedOffset) {
		return {
			logs: this.logData.slice(requestedOffset).join("\n"),
			offset: this.logData.length,
		};
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
		return ["file1.txt", "dir1"];
	}
};
