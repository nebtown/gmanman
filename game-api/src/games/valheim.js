const Gamedig = require("gamedig");
const path = require("path");

const {
	game,
	gameId,
	debugLog,
	connectUrl,
	rconPort,
	gameDir,
} = require("../cliArgs");
const { dockerComposePull, gamedigQueryPlayers } = require("./common-helpers");
const GenericDockerManager = require("./docker");
const { spawnProcess } = require("../libjunkdrawer/fsPromises");
const fse = require("fs-extra");

module.exports = class ValheimManager extends GenericDockerManager {
	getConnectUrl() {
		return connectUrl;
	}
	async getPlayers() {
		return await gamedigQueryPlayers({
			type: "valheim", // Gamedig lacks Valheim but css is compatible
			socketTimeout: 4000,
		});
	}
	update = false; // updates on boot
	/*async update() {
		dockerComposePull()
			.then(res => {
				console.log("finished docker pull: ", res);
				this.setStatus("stopped");
			})
			.catch(e => {
				console.log("docker pull failed:", e);
			});
	}*/
	async filesToBackup() {
		return ["saves"];
	}

	/**
	 * Copies mod files to be saved in the modPack.7z into a temporary directory.
	 * Valheim's assumes the presense of a gmanman/game-setups/valheim/modpack-base/ containing the latest Windows binaries for BepInEx
	 */
	async prepareModPackTempDir(packTempPath) {
		const archiveRootPath = `${packTempPath}/Valheim`;

		await fse.copy(
			path.join(__dirname, `../../../game-setups/${game}/modpack-base`),
			archiveRootPath
		);
		await fse.copy(
			path.join(gameDir, "server/BepInEx/config"),
			path.join(archiveRootPath, "BepInEx/config")
		);
		await fse.copy(
			path.join(gameDir, "server/BepInEx/plugins"),
			path.join(archiveRootPath, "BepInEx/plugins")
		);
		return archiveRootPath;
	}
	async getModPackHash() {
		return (
			await spawnProcess("bash", [
				"-c",
				`cd ${gameDir} && find server/BepInEx/{config,plugins} -type f -exec md5sum {} \\; | sort -k 2 | md5sum | cut -d ' ' -f1`,
			])
		).trim();
	}
};
