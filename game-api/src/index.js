const express = require("express");
const cors = require("cors");
const gcs = require("./libjunkdrawer/gcs");
const sevenzip = require("node-7z");
const axios = require("axios");
const app = express();

const {
	game,
	gameId,
	gameName,
	gameDir,
	urlRoot,
	debugLog,
	listenPort,
	gatewayUrl,
} = require("./cliArgs");

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
	if (!gameManager.filesToBackup) {
		return response.status(501).json({ ok: false, error: "Not Implemented" });
	}
	if (await gameManager.isProcessRunning()) {
		return response.status(412).json({ ok: false, message: "game is running" });
	}

	const backupFile = `${game}-backup-${new Date().toISOString()}.7z`;
	const stream = sevenzip.add(backupFile, gameManager.filesToBackup(), {
		timeStats: true,
		workingDir: gameDir,
	});

	const promise = new Promise((resolve, reject) => {
		stream.on("end", async function() {
			try {
				await gcs.uploadFile(game, backupFile);
				resolve({ ok: true });
			} catch (uploadErr) {
				console.warn("Backup Upload ", uploadErr);
				resolve({ ok: false, error: uploadErr.message });
			}
		});

		stream.on("error", err => reject({ ok: false, error: err }));
	});

	try {
		response.json(await promise);
	} catch (err) {
		console.warn(err);
		response.json(err);
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
		response.status(500).json({});
	}
});

app.post("/update", async (request, response) => {
	if (!gameManager.update) {
		return response.status(501).json({ error: "Not Implemented" });
	}
	currentStatus = "updating";
	gameManager.update();
	response.json({ status: currentStatus });
});

app.get("/mods", async (request, response) => {
	if (!gameManager.getMods) {
		response.status(501).json({ error: "Not Implemented" });
	}
	response.json({ mods: gameManager.getMods() });
});
app.put("/mods", async (request, response) => {
	if (!gameManager.setMods) {
		response.status(501).json({ error: "Not Implemented" });
	}
	if (gameManager.setMods(request.body.mods)) {
		response.json({});
	} else {
		response.status(400).json({ error: "Failed setting mods" });
	}
});
// Returns a complete list of all possible mods, for clientside searching
// Probably not possible for most games...
app.get("/mods/list", async (request, response) => {
	if (!gameManager.getModList) {
		response.status(501).json({ error: "Not Implemented" });
	}
	response.json({ mods: await gameManager.getModList() });
});
app.get("/mods/search", async (request, response) => {
	if (!gameManager.getModSearch) {
		response.status(501).json({ error: "Not Implemented" });
	}
	response.json({
		mods: await gameManager.getModSearch(request.query.q || ""),
	});
});

app.listen(listenPort);
console.log(`Listening on port ${listenPort}`);

async function registerWithGateway() {
	try {
		return await axios.post(`${gatewayUrl}register/`, {
			game,
			id: gameId,
			name: gameName,
			url: urlRoot,
			connectUrl: gameManager.getConnectUrl && gameManager.getConnectUrl(),
			features: [
				gameManager.logs && "logs",
				gameManager.getMods && "mods",
				gameManager.getModList && "modList",
				gameManager.getModSearch && "modSearch",
				gameManager.update && "update",
				gameManager.filesToBackup && "backup",
			].filter(Boolean),
		});
	} catch (err) {
		console.error("Failed to register with Gateway", err.message);
		return new Promise(() => {});
	}
}
registerWithGateway().then(({ data }) =>
	console.log("Registered with Gateway", data)
);
setInterval(registerWithGateway, 60 * 1000);
