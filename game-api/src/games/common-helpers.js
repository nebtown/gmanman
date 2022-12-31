const fsPromises = require("../libjunkdrawer/fsPromises");
const path = require("path");
const stream = require("stream");
const dotenv = require("dotenv");
const compose = require("docker-compose");
const Rcon = require("modern-rcon");
const srcdsRcon = require("srcds-rcon");
const axios = require("axios");
const Gamedig = require("gamedig");
const docker = new (require("dockerode"))();
const { readFile, writeFile } = require("../libjunkdrawer/fsPromises");
const {
	generateBackupFilename,
	makeBackup,
} = require("../libjunkdrawer/archives");

const {
	game,
	gameId,
	gameDir,
	connectUrl,
	debugLog,
	rconPort,
	argv,
	steamApiKey,
} = require("../cliArgs");

function dockerComposeStart() {
	compose.upAll({ dir: gameDir });
}
function dockerComposeStop() {
	compose.down({ dir: gameDir });
}
function dockerComposePull(params) {
	return compose.pullAll({
		dir: gameDir,
		...params,
	});
}
function dockerComposeBuild(params) {
	return compose.buildOne(game, {
		dir: gameDir,
		...params,
	});
}
async function dockerIsProcessRunning() {
	const container = docker.getContainer(gameId);
	return await container
		.inspect()
		.then((containerDetails) => containerDetails.State.Running)
		.catch((reason) => false);
}
async function dockerLogs() {
	try {
		const container = docker.getContainer(gameId);
		return (await container.logs({ stdout: true, tail: 100 })).toString();
	} catch (err) {
		console.warn("logs:", err.message);
		return "";
	}
}

let logCache = [];
async function dockerLogRead(offset = -100) {
	const container = docker.getContainer(gameId);
	await dockerLogStreamStart(container);
	if ((!offset && offset !== 0) || offset < 0) {
		offset = Math.max(0, logCache.length + (offset || -100));
	}
	return {
		logs: logCache.slice(offset).join("\n"),
		offset: logCache.length,
	};
}
async function dockerLogStreamStart(container) {
	if (this.logStream) {
		return;
	}

	const logStream = await container.logs({
		follow: true,
		stdout: true,
		stderr: true,
		tail: 1000,
	});
	this.logStream = logStream;

	logStream.on("data", (chunk) => {
		console.log("D", chunk.toString("utf8").trimEnd());
		logCache.push(...chunk.toString("utf8").trimEnd().split("\n"));
		if (logCache.length > 15000) {
			logCache.splice(0, logCache.length - 10000);
		}
	});
	logStream.on("end", () => {
		delete this.logStream;
		logCache.push("[end-of-logs]");
	});

	// delay so we can get some logs
	return await new Promise((resolve) =>
		setTimeout(() => resolve(logStream), 500)
	);
}

async function gamedigQueryPlayers(options = {}) {
	try {
		const response = await Gamedig.query({
			type: gameId,
			host: `localhost`,
			socketTimeout: 750,
			...(rconPort ? { port: rconPort } : {}),
			...options,
		});
		return response.players;
	} catch (err) {
		debugLog(`gamedigQueryPlayers err: ${err}`);
		return false;
	}
}

async function rconConnect(port) {
	if (!this.rcon || !this.rcon.hasAuthed) {
		this.rcon = new Rcon("localhost", port, argv.rconPassword || "", 500);
		await this.rcon.connect();
	}
	return this.rcon;
}

async function rconSRCDSConnect(port) {
	const rcon = srcdsRcon({
		address: `localhost:${port}`,
		password: argv.rconPassword || "",
	});
	await rcon.connect();
	return rcon;
}

async function readEnvFileCsv(envName) {
	try {
		const env = dotenv.parse(
			await fsPromises.readFile(path.join(gameDir, ".env"))
		);
		if (!env[envName]) {
			return [];
		}
		return env[envName].trim().split(",");
	} catch (e) {
		console.warn("Unable to read .env", e);
		return [];
	}
}

async function writeEnvFile(changes) {
	const envFilePath = path.join(gameDir, ".env");
	const envFileContents = (await fsPromises.readFile(envFilePath)) || "";
	let newEnvFile = envFileContents.toString();
	for (let envName in changes) {
		newEnvFile =
			newEnvFile
				.replace(new RegExp(`^${envName}=".*?"\n?`, "ms"), "")
				.replace(new RegExp(`^${envName}=.*?$\n?`, "m"), "")
				.trim() + `\n${envName}="${changes[envName]}"\n`;
	}
	await fsPromises.writeFile(envFilePath, newEnvFile);
}

function steamWorkshopQuerySingleMod(appid, query) {
	return axios.get(
		`https://api.steampowered.com/IPublishedFileService/GetDetails/v1/?publishedfileids[0]=${query}`,
		{
			params: {
				key: steamApiKey,
				appid: appid,
				short_description: 1,
				strip_description_bbcode: 1,
			},
		}
	);
}
function steamWorkshopSearchMods(appid, query) {
	const queryParams = query
		? {
				search_text: query,
				query_type: 0,
		  }
		: {};
	return axios.get(
		"https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/" +
			"?requiredtags[0]=mod",
		{
			params: {
				key: steamApiKey,
				appid: appid,
				numperpage: 100, // 100 seems to be max
				cache_max_age_seconds: 60 * 60 * 24,
				// requiredtags: { "0": "mod" }, // needs to go in url for axios to format it correctly
				return_short_description: 1,
				return_details: 1,
				strip_description_bbcode: 1,
				query_type: 9, // 9 = most subscriptions (can't use cursors), 0 "top rated", 1 "most recent".
				// 9 + search seems borked :S
				...queryParams,
			},
		}
	);
}
async function steamWorkshopGetModSearch(appid, query) {
	let data, headers;
	try {
		({ data, headers } = await (query.match(/^[0-9]{4,30}$/)
			? steamWorkshopQuerySingleMod(appid, query)
			: steamWorkshopSearchMods(appid, query)));
	} catch (err) {
		console.warn("getModSearch", err);
		return [];
	}
	if (data.response && data.response.publishedfiledetails) {
		return data.response.publishedfiledetails.map(
			({
				publishedfileid,
				title,
				short_description,
				time_updated,
				subscriptions,
			}) => ({
				id: publishedfileid,
				label: title,
				href: `https://steamcommunity.com/sharedfiles/filedetails/?id=${publishedfileid}`,
				updated: time_updated,
			})
		);
	} else {
		debugLog("getModSearch missing data", data, headers);
		if (headers["x-eresult"] === "10") {
			throw { error: "Steam Workshop is rate limiting their API" };
		}
	}
	return [];
}

class BaseGameManager {
	constructor() {
		if (!this.prepareModPackTempDir) {
			this.getModPack = false;
		}
	}
	getConnectUrl() {
		return `steam://connect/${connectUrl}`;
	}

	/**
	 * Gets a cached .7z containing mods, or generates a new one if the files have changed.
	 * This method requires GameManagers to implement getModPackHash() and prepareModPackTempDir.
	 * @returns filePath.7z
	 */
	async getModPack() {
		const currentHash = await this.getModPackHash();
		const storedHashFilePath = path.join(gameDir, "modPackData.json");

		let lastModPackData = {};
		try {
			lastModPackData = JSON.parse(await readFile(storedHashFilePath));
		} catch (err) {}
		if (currentHash === lastModPackData.hash) {
			return lastModPackData.filePath;
		}

		const modPackFilePath = await this.#buildModPack();
		void writeFile(
			storedHashFilePath,
			JSON.stringify({ hash: currentHash, filePath: modPackFilePath })
		);

		return modPackFilePath;
	}

	/**
	 * Creates a new .7z containing mods, to be distributed to clients.
	 * @returns filePath.7z
	 */
	async #buildModPack() {
		const modPackFilePath = generateBackupFilename(`${gameId}-mods`, gameDir);
		const modPackFilename = path.basename(modPackFilePath);
		const packTempPath = `/tmp/modpacks/${modPackFilename}`;

		const archiveRootPath = await this.prepareModPackTempDir(packTempPath);
		await makeBackup(modPackFilePath, gameDir, [archiveRootPath]);

		return modPackFilePath;
	}
}

module.exports = {
	dockerComposeStart,
	dockerComposeStop,
	dockerComposeBuild,
	dockerComposePull,
	dockerIsProcessRunning,
	dockerLogs,
	dockerLogRead,
	gamedigQueryPlayers,
	rconConnect,
	rconSRCDSConnect,
	readEnvFileCsv,
	writeEnvFile,
	steamWorkshopGetModSearch,
	BaseGameManager,
};
