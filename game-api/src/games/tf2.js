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

module.exports = class TF2Manager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
		this.APPID = 440;
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
				type: "tf2",
				host: `localhost`,
				socketTimeout: 750,
			});
			return response.players.length;
		} catch (err) {
			debugLog(`TF2 getPlayerCount err: ${err}`);
			return false;
		}
	}
	async logs(requestedOffset) {
		const { logs, offset } = await dockerLogRead(requestedOffset);
		return {
			logs: stripAnsi(logs),
			offset,
		};
	}

	async rcon(command) {
		debugLog(`Running rcon: ${command}`);
		try {
			const response = await (await rconSRCDSConnect(rconPort)).command(
				command,
				500
			);
			debugLog(`Rcon response: ${response}`);
			return true;
		} catch (e) {
			console.warn("rcon error", e.message);
			return false;
		}
	}
	update() {
		dockerComposeBuild({
			commandOptions: [["--build-arg", `TRIGGER_UPDATE=${Date.now()}`]],
		})
			.then(res => {
				console.log("finished tf2 update: ", res);
				this.setStatus("stopped");
			})
			.catch(e => {
				console.error("update error: ", e);
			});
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
};
