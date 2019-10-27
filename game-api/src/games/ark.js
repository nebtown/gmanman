const stripAnsi = require("strip-ansi");
const docker = new (require("dockerode"))();

const { game, debugLog, connectUrl } = require("../cliArgs");
const CommonDockerGameManager = require("./common-docker-game-manager");

module.exports = class ArkManager extends CommonDockerGameManager {
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:27015"}`;
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
			response = await new Promise(async (resolve, reject) => {
				await exec.start(async (err, stream) => {
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
		const logs = await super.logs();
		return stripAnsi(logs.replace(/^(.{8})/gm, ""));
	}
};
