const gamedig = require("gamedig");
const { spawn: spawnProcess } = require("child_process");

const { gameDir, debugLog, connectUrl, steamApiKey } = require("../cliArgs");
const { steamWorkshopGetModSearch } = require("./common-helpers");

module.exports = class SpaceEngineersManager {
	constructor({ setStatus }) {
		this.setStatus = setStatus;
		this.logData = "";
		this.APPID = 244850;
	}
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:29016"}`;
	}
	start() {
		this.logData += "\n\n\nLaunching...\n";
		this.process = spawnProcess(path.join(gameDir, "Torch.Server.exe"));
		this.process.stdout.on("data", data => {
			let text = data.toString().trim();
			debugLog(text);
			this.logData += text + "\n";
		});
		this.process.stderr.on("data", data => {
			let text = data.toString().trim();
			debugLog(text);
			this.logData += text + "\n";
		});
		this.process.on("close", (code, signal) => {
			this.setStatus("stopped");
		});
	}
	stop() {
		this.process.kill("SIGINT");
	}
	async isProcessRunning() {
		return !!this.process && !this.process.killed;
	}
	async getPlayerCount() {
		try {
			const state = await gamedig.query({
				type: "spaceengineers",
				host: "localhost",
				port: 29016,
			});
			return state.players.length;
		} catch (e) {
			debugLog("gamedig", e.message);
			return false;
		}
	}
	async logs() {
		return this.logData;
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
};

if (!steamApiKey) {
	console.warn("WARNING: --steamApiKey not found, mod searching disabled");
	delete module.exports.prototype.getModSearch;
}
