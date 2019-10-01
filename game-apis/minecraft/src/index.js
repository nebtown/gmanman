const express = require("express");
const cors = require("cors");
const path = require("path");
const argv = require("minimist")(process.argv.slice(2));
const app = express();
const compose = require("docker-compose");
const Rcon = require("modern-rcon");
const docker = new (require("dockerode"))();

const composeOptions = {
	cwd: path.join(__dirname, "../"),
};

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

async function rconConnect() {
	if (!this.rcon || !this.rcon.hasAuthed) {
		this.rcon = new Rcon("localhost", 27075, argv.rconPassword || "", 500);
		await this.rcon.connect();
	}
	return this.rcon;
}

let currentStatus = "unknown";

async function rconGetPlayerCount() {
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

async function isContainerRunning() {
	const container = docker.getContainer("minecraft");
	const containerDetails = await container.inspect();

	return containerDetails.State.Running;
}

app.get("/control", async (request, response) => {
	if (["unknown", "starting", "running"].includes(currentStatus)) {
		let playerCount = await rconGetPlayerCount();
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

app.get("/logs", async (request, response) => {
	try {
		const container = docker.getContainer("minecraft");
		const logs = await container.logs({ stdout: true, tail: 50 });
		const logsCleaned = logs.toString().replace(/^(.*?)\[/gm, "[");
		response.json({ logs: logsCleaned });
	} catch (e) {
		console.log("/logs: ", e);
		response.json({});
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
