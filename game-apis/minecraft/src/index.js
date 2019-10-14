const express = require("express");
const cors = require("cors");
const path = require("path");
const stripAnsi = require("strip-ansi");
const argv = require("minimist")(process.argv.slice(2));
const app = express();
const compose = require("docker-compose");
const Rcon = require("modern-rcon");
const docker = new (require("dockerode"))();

const composeOptions = {
	cwd: argv.dir ? path.join(argv.dir) : path.join(__dirname, "../"),
};

const game = argv.game || "minecraft";

app.use(cors()); // enable CORS on all routes
app.use((request, response, next) => {
	console.log(`- ${request.method} ${request.originalUrl}`);
	next();
});

app.get("/", (request, response) => {
	response.json({});
});

function debugLog(...args) {
	if (argv.v) {
		console.log(...args);
	}
}

function getRconPort() {
	if (game === "ark") {
		return 32330;
	} else if (game === "minecraft") {
		return 27075;
	} else if (game === "factorio") {
		return 34198;
	}
}

async function rconConnect() {
	if (!this.rcon || !this.rcon.hasAuthed) {
		this.rcon = new Rcon(
			"localhost",
			getRconPort(),
			argv.rconPassword || "",
			500
		);
		await this.rcon.connect();
	}
	return this.rcon;
}

let currentStatus = "unknown";

async function minecraftGetPlayerCount() {
	let playerList;
	try {
		playerList = await (await rconConnect()).send("list");
	} catch (e) {
		debugLog("rcon", e.message);
		return false;
	}
	const matches = playerList.match(
		/There are (\d+) of a max \d+ players online:/
	);
	if (!matches) {
		console.warn("playerList: ", playerList);
		return false;
	}
	return Number(matches[1]);
}

async function arkGetPlayerCount() {
	// in theory the game has rcon, but it wasn't seeming to work...

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

async function factorioGetPlayerCount() {
	let playerList;
	try {
		playerList = await (await rconConnect()).send("/players");
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

async function getPlayerCount() {
	if (game === "minecraft") {
		return await minecraftGetPlayerCount();
	} else if (game === "ark") {
		return await arkGetPlayerCount();
	} else if (game === "factorio") {
		return await factorioGetPlayerCount();
	}
}

async function isContainerRunning() {
	const container = docker.getContainer(game);
	return await container
		.inspect()
		.then(containerDetails => containerDetails.State.Running)
		.catch(reason => false);
}

app.get("/control", async (request, response) => {
	if (["unknown", "starting", "running"].includes(currentStatus)) {
		let playerCount = await getPlayerCount();
		if (playerCount !== false) {
			debugLog(
				`was ${currentStatus}, found playerCount ${playerCount}, set to running`
			);
			currentStatus = "running";
			return response.json({ status: currentStatus, playerCount });
		}
	}
	if ("unknown" === currentStatus) {
		currentStatus = (await isContainerRunning()) ? "starting" : "stopped";
		debugLog("was unknown, now", currentStatus);
		return response.json({ status: currentStatus });
	}
	if ("stopping" === currentStatus) {
		if (!(await isContainerRunning())) {
			debugLog("was stopping, now stopped");
			currentStatus = "stopped";
			return response.json({ status: currentStatus });
		}
	}

	debugLog("repeating old status", currentStatus);
	return response.json({ status: currentStatus });
});
app.put("/control", (request, response) => {
	if (["stopped", "unknown"].includes(currentStatus)) {
		currentStatus = "starting";
		compose.upAll(composeOptions);
	}
	response.json({ status: currentStatus });
});
app.delete("/control", (request, response) => {
	if (["starting", "running", "unknown"].includes(currentStatus)) {
		currentStatus = "stopping";
		compose.stop(composeOptions);
	}
	response.json({ status: currentStatus });
});

async function getGameLogs() {
	const container = docker.getContainer(game);
	const logs = (await container.logs({ stdout: true, tail: 100 })).toString();
	if (game === "minecraft") {
		return logs.replace(/^(.*?)\[/gm, "["); // trim colour codes
	}
	if (game === "ark" || game === "factorio") {
		if (currentStatus === "updating") {
			return logs;
		}
		return stripAnsi(logs.replace(/^(.{8})/gm, ""));
	}
	return logs;
}

app.get("/logs", async (request, response) => {
	try {
		response.json({ logs: await getGameLogs() });
	} catch (e) {
		console.log("/logs: ", e);
		response.json({});
	}
});

app.post("/update", async (request, response) => {
	if (game === "factorio") {
		currentStatus = "updating";
		docker.pull("factoriotools/factorio");
		docker
			.run("factoriotools/factorio", [], [], {
				name: "factorio",
				Entrypoint: ["./docker-update-mods.sh"],
				HostConfig: {
					Binds: [`${composeOptions.cwd}volume:/factorio`],
					AutoRemove: true,
				},
			})
			.then(() => {
				currentStatus = "stopped";
			});
		response.json({ status: currentStatus });
	}
});

let statusSimulated = "stopped";
app.get("/test/control", (request, response) => {
	if (statusSimulated === "starting") {
		statusSimulated = "running";
	} else if (statusSimulated === "stopping") {
		statusSimulated = "stopped";
	}
	response.json({ status: statusSimulated });
});
app.put("/test/control", (request, response) => {
	statusSimulated = "starting";
	response.json({ status: statusSimulated });
});
app.delete("/test/control", (request, response) => {
	statusSimulated = "stopping";
	response.json({ status: statusSimulated });
});

const port = argv.port || 725;
app.listen(port);
console.log(`Listening on port ${port}`);
