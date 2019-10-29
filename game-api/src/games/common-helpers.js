const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const { gameDir } = require("../cliArgs");

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
	readEnvFileCsv,
	writeEnvFileCsv,
};
