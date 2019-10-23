const express = require("express");
const cors = require("cors");
const app = express();

const { game, argv, debugLog, listenPort } = require("./cliArgs");

app.use(cors()); // enable CORS on all routes
app.use((request, response, next) => {
	console.log(`- ${request.method} ${request.originalUrl}`);
	next();
});

app.get("/", (request, response) => {
	response.json({});
});

let currentStatus = "unknown";
function setStatus(newStatus) {
	currentStatus = newStatus;
}
function getCurrentStatus() {
	return currentStatus;
}

const gameManager = new (require("./" + game))({
	getCurrentStatus,
	setStatus,
});

app.get("/control", async (request, response) => {
	if (["unknown", "starting", "running"].includes(currentStatus)) {
		let playerCount = await gameManager.getPlayerCount();
		if (playerCount !== false) {
			debugLog(
				`was ${currentStatus}, found playerCount ${playerCount}, set to running`
			);
			currentStatus = "running";
			return response.json({ status: currentStatus, playerCount });
		}
	}
	if ("unknown" === currentStatus) {
		currentStatus = (await gameManager.isProcessRunning())
			? "starting"
			: "stopped";
		debugLog("was unknown, now", currentStatus);
		return response.json({ status: currentStatus });
	}
	if ("stopping" === currentStatus) {
		if (!(await gameManager.isProcessRunning())) {
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
		gameManager.start();
	}
	response.json({ status: currentStatus });
});
app.delete("/control", (request, response) => {
	if (["starting", "running", "unknown"].includes(currentStatus)) {
		currentStatus = "stopping";
		gameManager.stop();
	}
	response.json({ status: currentStatus });
});
app.get("/logs", async (request, response) => {
	try {
		response.json({
			logs: (await gameManager.logs())
				.split(/\n/g)
				.slice(-100)
				.join("\n"),
		});
	} catch (e) {
		console.log("/logs: ", e);
		response.json({});
	}
});

app.post("/update", async (request, response) => {
	if (gameManager.update) {
		currentStatus = "updating";
		gameManager.update();
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

app.listen(listenPort);
console.log(`Listening on port ${listenPort}`);
