const stripAnsi = require("strip-ansi");
const docker = new (require("dockerode"))();
const path = require("path");

const { gameId, gameDir, debugLog, connectUrl } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogRead,
	readEnvFileCsv,
	writeEnvFileCsv,
	steamWorkshopGetModSearch,
} = require("./common-helpers");

module.exports = class ArkManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
		this.APPID = 346110;
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
	async getPlayers() {
		// in theory the game has rcon 32330, but it wasn't seeming to work...

		let response;
		const container = docker.getContainer(gameId);
		try {
			const exec = await container.exec({
				AttachStdout: true,
				Tty: false,
				Cmd: ["arkmanager", "status"],
			});
			response = await new Promise((resolve, reject) => {
				exec.start(async (err, stream) => {
					if (err) return reject();
					let message = "";
					stream.on("data", data => (message += data.toString()));
					stream.on("end", () => resolve(message));
				});
			});
		} catch (e) {
			debugLog("arkmanager status exception", e.message);
			return false;
		}
		debugLog("arkmanager status", response);

		const matches = response.match(/Active Players: (\d+)/);
		if (!matches) {
			console.warn("playerList: ", response);
			return false;
		}
		return [...new Array(Number(matches[1]))].map(_ => ({}));
	}
	async logs(requestedOffset) {
		const { logs, offset } = await dockerLogRead(requestedOffset);
		return {
			logs: stripAnsi(logs.replace(/^(.{8})/gm, "")),
			offset,
		};
	}
	async getMods() {
		return await readEnvFileCsv("ARK_MODS");
	}
	async setMods(modsList) {
		await writeEnvFileCsv("ARK_MODS", modsList);
		return true;
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
	async filesToBackup() {
		return ["Saved", ".env"];
	}
};
