const express = require("express");
const pretty = require("express-prettify");
const cors = require("cors");
const expressTimeoutHandler = require("express-timeout-handler");
const gcs = require("./libjunkdrawer/gcs");
const archives = require("./libjunkdrawer/archives");
const axios = require("axios");
const path = require("path");
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

const successTimeoutHandler = expressTimeoutHandler.handler({
	timeout: 4000,
	onTimeout: function(req, res) {
		res.status(200).json({ pending: true });
	},
	onDelayedResponse: function(req, method, args, requestTime) {
		const reqString = `${req.method} ${req.originalUrl}`;
		console.log(`${reqString} responded late (${requestTime / 1000}s)`);
	},
});
app.use(express.json());
app.use(pretty({ query: "pretty" }));
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

function sendSystemChat(message) {
	axios
		.post(`${gatewayUrl}messages/`, {
			message,
		})
		.catch(err => {
			console.error("Failed to register with Gateway", err.message);
		});
}

const gameManager = new (require("./games/" + game))({
	getCurrentStatus,
	setStatus,
});

app.get("/backup", async (request, response) => {
	if (!gameManager.filesToBackup) {
		return response.status(501).json({ ok: false, error: "Not Implemented" });
	}
	response.json({ backups: await gcs.listFiles(game) });
});

app.post("/backup", successTimeoutHandler, async (request, response) => {
	if (!gameManager.filesToBackup) {
		return response.status(501).json({ ok: false, error: "Not Implemented" });
	}
	if (await gameManager.isProcessRunning()) {
		return response.status(412).json({ ok: false, error: "game is running" });
	}

	const backupFile = archives.generateBackupFilename(gameId, gameDir);
	try {
		await archives.makeBackup(
			backupFile,
			gameDir,
			await gameManager.filesToBackup()
		);
		await gcs.uploadFile(game, backupFile);
		response.json({ ok: true });
	} catch (err) {
		console.warn("Backup error: ", err.message, backupFile);
		response.status(500).json({ ok: false, error: err.message });
	}
});

app.post("/restore", successTimeoutHandler, async (request, response) => {
	let { file, mostRecent } = request.body;
	if (mostRecent) {
		const files = await gcs.listFiles(game);
		file = files[0].name;
	}
	try {
		const backupsDir = await archives.makeBackupsDir(gameDir);
		const archiveFile = path.join(backupsDir, file);
		await gcs.downloadFile(game, file, archiveFile);
		archives.extractArchive(archiveFile, gameDir);
		response.json({ ok: true });
	} catch (err) {
		console.warn("Restore error: ", err.message, file);
		response.status(500).json({ ok: false, error: err.message });
	}
});

app.get("/control", async (request, response) => {
	if (["unknown", "starting", "running", "stopped"].includes(currentStatus)) {
		let playerCount =
			(await gameManager.isProcessRunning()) &&
			(await gameManager.getPlayerCount());
		if (playerCount !== false) {
			debugLog(
				`was ${currentStatus}, found playerCount ${playerCount}, set to running`
			);
			if (currentStatus !== "running") {
				currentStatus = "running";

				const connectText = gameManager.getConnectUrl
					? `, ${gameManager.getConnectUrl()} `
					: "";
				sendSystemChat(`${gameName} is up${connectText}!`);
			}
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
		sendSystemChat(
			`${gameName} is shutting down. ${Math.random() < 0.1 ? "Forever." : ""}`
		);
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
	response.json({ mods: await gameManager.getMods() });
});
app.put("/mods", async (request, response) => {
	if (!gameManager.setMods) {
		response.status(501).json({ error: "Not Implemented" });
	}
	if (await gameManager.setMods(request.body.mods)) {
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
	try {
		response.json({
			mods: await gameManager.getModSearch(request.query.q || ""),
		});
	} catch (err) {
		if (err.error) {
			response.status(500).json(err);
		}
	}
});

app.post("/rcon", async (request, response) => {
	if (!gameManager.rcon) {
		response.status(501).json({ error: "Not Implemented" });
	}
	if (await gameManager.rcon(request.body.rcon)) {
		response.json({});
	} else {
		response.status(400).json({ error: "Failed running rcon" });
	}
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
				gameManager.rcon && "rcon",
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
