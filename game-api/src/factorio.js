const stripAnsi = require("strip-ansi");
const docker = new (require("dockerode"))();

const { gameDir, debugLog } = require("./cliArgs");
const CommonDockerGameManager = require("./common-docker-game-manager");

module.exports = class FactorioManager extends CommonDockerGameManager {
	async getPlayerCount() {
		let playerList;
		try {
			playerList = await (await this.rconConnect(34198)).send("/players");
		} catch (e) {
			debugLog("rcon", e.message);
			return false;
		}
		const matches = playerList.match(/Players \((\d+)\):/);
		if (!matches) {
			console.warn("playerList: ", playerList);
			return false;
		}
		return Number(matches[1]);
	}
	async logs() {
		const logs = await super.logs();
		if (this.getCurrentStatus() === "updating") {
			return logs;
		}
		return stripAnsi(logs.replace(/^(.{8})/gm, ""));
	}
	update() {
		docker.pull("factoriotools/factorio");
		docker
			.run("factoriotools/factorio", [], [], {
				name: "factorio",
				Entrypoint: ["./docker-update-mods.sh"],
				HostConfig: {
					Binds: [`${gameDir}volume:/factorio`],
					AutoRemove: true,
				},
			})
			.then(() => {
				this.setStatus("stopped");
			});
	}
};
