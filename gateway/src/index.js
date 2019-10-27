const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const { debugLog, listenPort } = require("./cliArgs");

let knownGameApis = {};

app.use(express.json());
app.use(cors()); // enable CORS on all routes
app.use((request, response, next) => {
	console.log(`- ${request.method} ${request.originalUrl}`);
	next();
});

app.get("/", (request, response) => {
	response.json({});
});

app.get("/register", (request, response) => {
	response.json({
		games: Object.values(knownGameApis).map(
			({ game, id, name, connectUrl, features }) => ({
				game,
				id,
				name,
				connectUrl,
				features,
			})
		),
	});
});
/**
 * {
		game: "factorio",
		id: "factorio-angelbob",
		name: "Factorio Angelbob",
		connectUrl: "steam://connect/gman.nebtown.info:27015",
		features: [
			"logs",
			"mods",
			"update",
		],
	}
 */
app.post("/register", (request, response) => {
	knownGameApis[request.body.id] = request.body;
	debugLog(`Registered ${request.body.id}`, request.body);
	response.json({});
});

app.all("/:gameId/:endpoint", async (request, response) => {
	const { gameId, endpoint } = request.params;
	const gameApi = knownGameApis[gameId];
	if (!gameApi) {
		return response.json({ error: "game not found" });
	}
	const { data } = await axios({
		method: request.method,
		url: `${gameApi.url}/${endpoint}`,
	});
	response.json(data);
});

app.listen(listenPort);
console.log(`Gateway listening on port ${listenPort}`);
