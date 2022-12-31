const stripAnsi = require("strip-ansi");
const fs = require("../libjunkdrawer/fsPromises");
const fse = require("fs-extra");
const path = require("path");

const {
	game,
	gameId,
	gameName,
	gamePassword,
	gameDir,
	debugLog,
	connectUrl,
	gamePort,
	rconPort,
	saveName,
} = require("../cliArgs");
const {
	dockerComposeStart,
	dockerComposeStop,
	dockerComposeBuild,
	dockerComposePull,
	dockerIsProcessRunning,
	dockerLogRead,
	gamedigQueryPlayers,
	rconSRCDSConnect,
	writeEnvFile,
	BaseGameManager,
} = require("./common-helpers");

module.exports = class GenericDockerManager extends BaseGameManager {
	constructor({ getCurrentStatus, setStatus }) {
		super();
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
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
		return await gamedigQueryPlayers();
	}
	async logs(requestedOffset) {
		const { logs, offset } = await dockerLogRead(requestedOffset);
		return {
			logs: stripAnsi(logs),
			offset,
		};
	}

	getRconPort() {
		return rconPort;
	}

	async rcon(command) {
		debugLog(`Running rcon: ${command}`);
		try {
			const response = await (
				await rconSRCDSConnect(this.getRconPort())
			).command(command, 500);
			debugLog(`Rcon response: ${response}`);
			return true;
		} catch (e) {
			console.warn("rcon error", e.message);
			return false;
		}
	}
	async update() {
		dockerComposePull()
			.then((res) => {
				console.log("finished docker pull: ", res);
				this.setStatus("stopped");
			})
			.catch((e) => {
				console.log("docker pull failed:", e, ", attempting build:");
				dockerComposeBuild({
					commandOptions: [["--build-arg", `TRIGGER_UPDATE=${Date.now()}`]],
				})
					.then((res) => {
						console.log("finished update: ", res);
						this.setStatus("stopped");
					})
					.catch((e) => {
						console.error("update error: ", e);
					});
			});
	}

	async setupInstanceFiles() {
		if (!(await fs.exists(`${gameDir}docker-compose.yml`))) {
			await fse.copy(
				path.join(__dirname, `../../../game-setups/${game}`),
				gameDir,
				{
					overwrite: false,
				}
			);
		}
		if (!(await fs.exists(`${gameDir}.env`))) {
			await fs.writeFile(`${gameDir}.env`, "");
		}
		await writeEnvFile({
			API_ID: gameId,
			API_NAME: gameName,
			GAMEPASSWORD: gamePassword,
			SAVENAME: saveName,
			GAMEPORT: gamePort,
			RCONPORT: rconPort,
		});
	}
};
