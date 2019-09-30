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
	console.log(`Received ${request.method} ${request.originalUrl}`);
	next();
});

app.get("/", (request, response) => {
	response.json({});
});

let lastStartTime = 0;
let lastStopTime = 0;
app.get("/control", async (request, response) => {
	if (lastStartTime > Date.now() - 3) {
		// it takes a second for docker to start creating the container
		response.json({ status: "starting" });
		return;
	}
	if (lastStopTime > Date.now() - 8) {
		// it takes a second for docker to start creating the container
		response.json({ status: "stopping" });
		return;
	}

	let playerCount = -1;
	try {
		const rcon = new Rcon("localhost", 27075, argv.rconPassword || "", 500);
		await rcon.connect();
		const playerList = await rcon.send("list");
		const matches = playerList.match(
			/There are (\d+) of a max \d+ players online:/
		);
		if (!matches) {
			console.warn("playerList: ", playerList);
		}
		playerCount = matches ? Number(matches[1]) : -1;
		rcon.disconnect();

		response.json({ status: "running", playerCount });
	} catch {
		const container = docker.getContainer("minecraft");
		const containerDetails = await container.inspect();

		const status = containerDetails.State.Running ? "starting" : "stopped";

		response.json({ status });
	}
});
app.put("/control", (request, response) => {
	lastStartTime = Date.now();
	compose.upAll(composeOptions);
	response.json({ status: "starting" });
});
app.delete("/control", (request, response) => {
	lastStopTime = Date.now();
	compose.stop(composeOptions);
	response.json({ status: "stopping" });
});
app.get("/logs", async (request, response) => {
	try {
		const container = docker.getContainer("minecraft");
		const logs = await container.logs({ stdout: true, tail: 50 });
		const logsCleaned = logs.toString().replace(/^(.*?)\[/gm, "");
		response.json({ logs: logsCleaned });
	} catch (e) {
		console.log("/logs: ", e);
		response.json({});
	}
});

let statusSimulated = "stopped";
app.get("/controlTest", (request, response) => {
	if (statusSimulated === "starting") {
		statusSimulated = "running";
	} else if (statusSimulated === "stopping") {
		statusSimulated = "stopped";
	}
	response.json({ status: statusSimulated });
});
app.put("/controlTest", (request, response) => {
	statusSimulated = "starting";
	response.json({ status: statusSimulated });
});
app.delete("/controlTest", (request, response) => {
	statusSimulated = "stopping";
	response.json({ status: statusSimulated });
});

const port = argv.port || 725;
app.listen(port);
console.log(`Listening on port ${port}`);
