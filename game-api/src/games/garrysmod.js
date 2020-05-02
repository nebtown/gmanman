const stripAnsi = require("strip-ansi");
const Gamedig = require("gamedig");

const { gameId, gameDir, debugLog, connectUrl } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerComposeBuild,
	dockerIsProcessRunning,
	dockerLogs,
	rconSRCDSConnect,
	steamWorkshopGetModSearch,
} = require("./common-helpers");

module.exports = class GarrysmodManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
		this.APPID = 4000;
	}
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:27015"}`;
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
		try {
			const response = await Gamedig.query({
				type: "garrysmod",
				host: `localhost`,
				socketTimeout: 750,
			});
			return response.players.length;
		} catch (err) {
			debugLog(`Gmod getPlayerCount err: ${err}`);
			return false;
		}
	}
	async logs() {
		const logs = await dockerLogs();
		if (this.getCurrentStatus() === "updating") {
			return logs;
		}
		return stripAnsi(logs);
	}
	update() {
		dockerComposeBuild({
			commandOptions: [["--build-arg", `TRIGGER_UPDATE=${Date.now()}`]],
		})
			.then(res => {
				console.log("finished gmod update: ", res);
				this.setStatus("stopped");
			})
			.catch(e => {
				console.error("update error: ", e);
			});
	}
	async getModsTodo() {}
	async setModsTodo(modsList) {
		try {
			// todo
		} catch (e) {
			console.error("setMods error: ", e);
			return false;
		}
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
	async filesToBackupTodo() {}
};
