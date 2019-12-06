const fsPromises = require("../libjunkdrawer/fsPromises");
const path = require("path");
const dotenv = require("dotenv");
const compose = require("docker-compose");
const Rcon = require("modern-rcon");
const axios = require("axios");
const docker = new (require("dockerode"))();

const { gameId, gameDir, debugLog, argv, steamApiKey } = require("../cliArgs");

function dockerComposeStart() {
	compose.upAll({ dir: gameDir });
}
function dockerComposeStop() {
	compose.down({ dir: gameDir });
}
async function dockerIsProcessRunning() {
	const container = docker.getContainer(gameId);
	return await container
		.inspect()
		.then(containerDetails => containerDetails.State.Running)
		.catch(reason => false);
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

async function rconConnect(port) {
	if (!this.rcon || !this.rcon.hasAuthed) {
		this.rcon = new Rcon("localhost", port, argv.rconPassword || "", 500);
		await this.rcon.connect();
	}
	return this.rcon;
}

async function readEnvFileCsv(envName) {
	const env = dotenv.parse(
		await fsPromises.readFile(path.join(gameDir, ".env"))
	);
	return (env[envName] || "")
		.trim()
		.split(",")
		.map(id => ({ id, enabled: true }));
}

async function writeEnvFileCsv(envName, modsList) {
	const envFilePath = path.join(gameDir, ".env");
	const modsString = modsList
		.filter(({ enabled }) => enabled)
		.map(({ id }) => id)
		.join(",");
	const envFileContents = (await fsPromises.readFile(envFilePath)) || "";
	const newEnvFile =
		envFileContents
			.toString()
			.replace(new RegExp(`^${envName}=.*$\n?`, "m"), "")
			.trim() + `\n${envName}=${modsString}`;
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

module.exports = {
	dockerComposeStart,
	dockerComposeStop,
	dockerIsProcessRunning,
	dockerLogs,
	rconConnect,
	readEnvFileCsv,
	writeEnvFileCsv,
	steamWorkshopGetModSearch,
};
