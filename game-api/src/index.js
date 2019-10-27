const express = require("express");
const cors = require("cors");
const gcs = require("./libjunkdrawer/gcs");
const sevenzip = require('node-7z');
const app = express();

const { game, gameDir, argv, debugLog, listenPort } = require("./cliArgs");

app.use(express.json());
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

const gameManager = new (require("./games/" + game))({
	getCurrentStatus,
	setStatus,
});

app.get("/backup", async (request, response) => {
	if (await gameManager.isProcessRunning()) {
		return response.json({"ok": false, "message": "game is running"});
	}

	const d = new Date();
	const backupFile = game + "-backup-" + d.toISOString() + ".7z";

	const stream = sevenzip.add(
		backupFile,
		gameManager.filesToBackup(),
		{
			"timeStats": true,
			"workingDir": gameDir,
		},
	);

	const promise = new Promise((resolve, reject) => {
		stream.on('end', async function () {
			const uploadErr = await gcs.uploadFile(game, backupFile);
			if (uploadErr == null) {
				resolve({"ok": true})
			} else {
				console.warn(uploadErr);
				resolve({"ok": false, "error": uploadErr});
			}
		});

		stream.on('error', (err) => reject({"ok": false, "error": err}))
	});

	try {
		response.json(await promise)
	} catch (err) {
		console.warn(err);
		response.json(err)
	}
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

app.get("/mods", async (request, response) => {
	if (gameManager.getMods) {
		response.json({ mods: gameManager.getMods() });
	}
});
app.put("/mods", async (request, response) => {
	if (gameManager.setMods) {
		if (gameManager.setMods(request.body.mods)) {
			response.json({});
		} else {
			throw new Error("Failed setting mods");
		}
	}
});

let statusSimulated = "stopped";
app.get("/test/control", (request, response) => {
	if (statusSimulated === "starting") {
		statusSimulated = "running";
	} else if (statusSimulated === "stopping") {
		statusSimulated = "stopped";
	}
	response.json({ status: statusSimulated, playerCount: 0 });
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
