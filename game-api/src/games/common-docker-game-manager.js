const compose = require("docker-compose");
const Rcon = require("modern-rcon");
const docker = new (require("dockerode"))();

const { game, gameDir, debugLog, argv } = require("../cliArgs");

module.exports = class CommonDockerGameManager {
	constructor({ getCurrentStatus, setStatus }) {
		this.getCurrentStatus = getCurrentStatus;
		this.setStatus = setStatus;
		this.logData = "";
	}
	start() {
		this.logData += "\n\n\nLaunching...\n";

		compose.upAll({ dir: gameDir });
	}
	stop() {
		compose.stop({ dir: gameDir });
	}
	async isProcessRunning() {
		const container = docker.getContainer(game);
		return await container
			.inspect()
			.then(containerDetails => containerDetails.State.Running)
			.catch(reason => false);
	}
	async getPlayerCount() {
		return false;
	}
	async logs() {
		const container = docker.getContainer(game);
		try {
			return (await container.logs({ stdout: true, tail: 100 })).toString();
		} catch (err) {
			console.warn("logs:", err.message);
			return "";
		}
	}
	async rconConnect(port) {
		if (!this.rcon || !this.rcon.hasAuthed) {
			this.rcon = new Rcon(
				"localhost",
				port,
				argv.rconPassword || "",
				500
			);
			await this.rcon.connect();
		}
		return this.rcon;
	}
};
