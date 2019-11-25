const stripAnsi = require("strip-ansi");
const docker = new (require("dockerode"))();
const path = require("path");

const { game, gameDir, debugLog, connectUrl } = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogs,
	readEnvFileCsv,
	writeEnvFileCsv,
} = require("./common-helpers");

module.exports = class ArkManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
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
		// in theory the game has rcon 32330, but it wasn't seeming to work...

		let response;
		const container = docker.getContainer(game);
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
		return Number(matches[1]);
	}
	async logs() {
		const logs = await dockerLogs();
		return stripAnsi(logs.replace(/^(.{8})/gm, ""));
	}
	async getMods() {
		return await readEnvFileCsv("ARK_MODS");
	}
	async setMods(modsList) {
		await writeEnvFileCsv("ARK_MODS", modsList);
		return true;
	}
	async filesToBackup() {
		return ["Saved", ".env"];
	}
};
