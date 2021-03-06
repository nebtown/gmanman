const stripAnsi = require("strip-ansi");
const Gamedig = require("gamedig");

const { gameId, debugLog, connectUrl, rconPort } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerComposeBuild,
	dockerComposePull,
	dockerIsProcessRunning,
	dockerLogRead,
	rconSRCDSConnect,
} = require("./common-helpers");

module.exports = class GenericDockerManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
	}
	getConnectUrl() {
		return `steam://connect/${connectUrl}`;
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
				type: gameId,
				host: `localhost`,
				socketTimeout: 750,
			});
			return response.players.length;
		} catch (err) {
			debugLog(`getPlayerCount err: ${err}`);
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
	async update() {
		dockerComposePull()
			.then(res => {
				console.log("finished docker pull: ", res);
				this.setStatus("stopped");
			})
			.catch(e => {
				console.log("docker pull failed:", e, ", attempting build:");
				dockerComposeBuild({
					commandOptions: [["--build-arg", `TRIGGER_UPDATE=${Date.now()}`]],
				})
					.then(res => {
						console.log("finished update: ", res);
						this.setStatus("stopped");
					})
					.catch(e => {
						console.error("update error: ", e);
					});
			});
	}
};
