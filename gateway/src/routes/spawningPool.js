const child_process = require("node:child_process");
const path = require("path");
const axios = require("axios");
const ps = require("ps-node");
const express = require("express");
const spawningPoolRouter = express.Router();

const {
	exists,
	mkdir,
	readFile,
	writeFile,
	open,
} = require("../lib/fsPromises");
const { jsonPretty } = require("../lib/jsonPretty");

/*
interface ChildApi {
    gameId: String;
    game: String; // like 'minecraft'
    name: String;
    gamePort: Number;
    rconPort: Number; // often gamePort or gamePort+1
    apiPort: Number; // coooould be fully dynamic, but having it be predictable is likely nice
	gamePassword: String;
}
*/

async function initSpawningPool() {
	const spawningPools = await readSpawningPoolConfig();
	for (let childApi of Object.values(spawningPools)) {
		console.log("Checking child gameApi ", childApi.gameId);
		try {
			const { data } = await axios.get(
				`http://localhost:${childApi.apiPort}/control`
			);
			console.debug("Got response", data);
		} catch (e) {
			console.error(
				`checkChildApi ${childApi.gameId} error: `,
				e.message,
				", respawning..."
			);
			await spawnChildApi(childApi);
		}
	}
}

async function readSpawningPoolConfig() {
	try {
		const fileContents = await readFile("spawningPool.json");
		return JSON.parse(fileContents);
	} catch (e) {
		if (!e.message.startsWith("ENOENT: no such file or directory")) {
			console.error("Failed to read childApisConfig: ", e.message);
		}
		return {};
	}
}

async function writeSpawningPoolConfig(data) {
	await writeFile("spawningPool.json", jsonPretty(data));
}

async function spawnChildApi(childApi) {
	const workingDir = `/servers/${childApi.gameId}/`;
	if (!(await exists(workingDir))) {
		await mkdir(workingDir);
	}
	const logFile = await open(`${workingDir}gameApi.log`, "a");

	const subprocess = child_process.fork(
		path.resolve(`../game-api/src/index`),
		[
			`--game=${childApi.game}`,
			`--gameId=${childApi.gameId}`,
			`--gameName=${childApi.name}`,
			`--port=${childApi.apiPort}`,
			`--urlRoot=http://localhost:${childApi.apiPort}/`,
			`--dir=${workingDir}`,
			`--serviceAccount=${path.resolve("../game-api/serviceaccount.json")}`,
			`--gamePort=${childApi.gamePort || ""}`,
			`--rconPort=${childApi.rconPort || ""}`,
			`--gamePassword=${childApi.gamePassword || ""}`,
			`--saveName=${childApi.saveName || ""}`,
		],
		{
			detached: true,
			stdio: ["pipe", logFile, logFile, "ipc"],
			cwd: workingDir,
		}
	);

	subprocess.unref();
	subprocess.disconnect(); // stop receiving IPC messages
}

async function stopChildApi(gameId) {
	return await new Promise((resolve, reject) => {
		ps.lookup(
			{
				command: "node",
				arguments: `--gameId=${gameId}`,
			},
			function (err, resultList) {
				if (err) {
					console.error("stopChildApi lookup error: ", err);
					return reject(err);
				}
				if (resultList.length === 0) {
					return resolve(); // no process found
				}
				ps.kill(resultList[0].pid, function (err) {
					if (err) {
						console.error("stopChildApi kill error: ", err);
					}
					resolve();
				});
			}
		);
	});
}

function generateUnusedApiPort(configs) {
	const highestUsedPort =
		Math.max(...Object.values(configs).map(({ apiPort }) => apiPort || 0)) ||
		42100;
	return highestUsedPort + 1;
}

// routing stuff

const { checkAuthMiddleware } = require("../lib/login");
spawningPoolRouter.use(
	checkAuthMiddleware([
		["GET", "/"],
		["PUT", "/"],
	])
);

spawningPoolRouter.get("/", async function (req, response) {
	response.json({ gameApis: Object.values(await readSpawningPoolConfig()) });
});

spawningPoolRouter.put("/", async function (req, response) {
	console.log("SpawningPool: Received PUT /", req.body);
	const updatedGameApi = req.body.gameApi;
	delete updatedGameApi["isNew"];
	const allConfigs = await readSpawningPoolConfig();
	allConfigs[updatedGameApi.gameId] = {
		...(allConfigs[updatedGameApi.gameId] || {}),
		...updatedGameApi,
	};
	if (!allConfigs[updatedGameApi.gameId].apiPort) {
		allConfigs[updatedGameApi.gameId].apiPort =
			generateUnusedApiPort(allConfigs);
	}
	await writeSpawningPoolConfig(allConfigs);

	response.json({ status: "ok" });

	await stopChildApi(updatedGameApi.gameId);
	void initSpawningPool();
});

module.exports = {
	initSpawningPool,
	spawningPoolRouter,
};
