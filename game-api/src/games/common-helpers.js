const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const compose = require("docker-compose");
const Rcon = require("modern-rcon");
const docker = new (require("dockerode"))();

const { game, gameDir, debugLog, argv } = require("../cliArgs");

function dockerComposeStart() {
	compose.upAll({ dir: gameDir });
}
function dockerComposeStop() {
	compose.stop({ dir: gameDir });
}
async function dockerIsProcessRunning() {
	const container = docker.getContainer(game);
	return await container
		.inspect()
		.then(containerDetails => containerDetails.State.Running)
		.catch(reason => false);
}
async function dockerLogs() {
	try {
		const container = docker.getContainer(game);
		return (await container.logs({ stdout: true, tail: 100 })).toString();
	} catch (err) {
		console.warn("logs:", err.message);
		return "";
	}
}

async function rconConnect(port) {
	if (!this.rcon || !this.rcon.hasAuthed) {
		this.rcon = new Rcon("localhost", port, argv.rconPassword || "", 500);
		await this.rcon.connect();
	}
	return this.rcon;
}

function readEnvFileCsv(envName) {
	const env = dotenv.parse(fs.readFileSync(path.join(gameDir, ".env")));
	return (env[envName] || "")
		.trim()
		.split(",")
		.map(id => ({ id, enabled: true }));
}

function writeEnvFileCsv(envName, modsList) {
	const envFilePath = path.join(gameDir, ".env");
	const modsString = modsList
		.filter(({ enabled }) => enabled)
		.map(({ id }) => id)
		.join(",");
	const envFileContents = fs.readFileSync(envFilePath) || "";
	const newEnvFile =
		envFileContents
			.toString()
			.replace(new RegExp(`^${envName}=.*$\n?`, "m"), "")
			.trim() + `\n${envName}=${modsString}`;
	fs.writeFileSync(envFilePath, newEnvFile);
}

module.exports = {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogs,
	rconConnect,
	readEnvFileCsv,
	writeEnvFileCsv,
};
