const express = require("express");
const pretty = require("express-prettify");
const http = require("http");
const cors = require("cors");
const axios = require("axios");
const querystring = require("querystring");
const otplib = require("otplib");

const app = express();
const { debugLog, listenPort } = require("./cliArgs");
const {
	verifyGoogleJWT,
	isEmailAdmin,
	checkAuthMiddleware,
} = require("./lib/login");

let knownGameApis = {};

app.use(express.json());
app.use(pretty({ query: "pretty" }));
const corsOptions = {
	allowedHeaders: ["Content-Type", "Authorization"],
	maxAge: 3600,
};
app.use(cors(corsOptions)); // enable CORS on all routes
app.use((request, response, next) => {
	console.log(`- ${request.method} ${request.originalUrl}`);
	next();
});
app.use(
	checkAuthMiddleware([
		["POST", "/update"],
		["PUT", "/mods"],
		["POST", "/backup"],
		["POST", "/restore"],
		["POST", "/rcon"],
	])
);

app.get("/", (request, response) => {
	response.json({});
});

const {
	router: messagesRouter,
	sendMessage,
	initWebsocketListener,
} = require("./routes/messages");
app.use("/messages", messagesRouter);

app.post("/auth", async (request, response) => {
	const token = request.body.id_token;
	try {
		const decoded = await verifyGoogleJWT(token);
		debugLog("/auth verified: ", decoded);
		response.json({
			token: decoded,
			isAdmin: isEmailAdmin(decoded.email),
		});
	} catch (err) {
		console.warn("/auth denied:", err);
		response.status(403).json({ error: err });
	}
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
	knownGameApis[request.body.id] = { ...request.body, timeoutStartTime: 0 };
	debugLog(`Registered ${request.body.id}`, request.body);
	response.json({});
});

app.all("/:gameId/*", async (request, response) => {
	const { gameId, "0": endpoint } = request.params;
	const gameApi = knownGameApis[gameId];
	if (!gameApi) {
		return response.status(404).json({ error: "GameIdNotFound" });
	}
	const query = request.query;
	let totp;
	if (gameApi.totpSecret) {
		totp = otplib.totp.generate(gameApi.totpSecret);
		if (request.method === "GET") {
			query.totp = totp;
		}
	}
	const queryString = Object.keys(query).length
		? "?" + querystring.stringify(query)
		: "";
	try {
		const { data } = await axios({
			method: request.method,
			url: `${gameApi.url}${endpoint}${queryString}`,
			data: { ...request.body, totp },
			timeout: 5000,
		});
		response.json(data);
		gameApi.timeoutStartTime = 0;
	} catch (err) {
		if (err.code === "ECONNREFUSED") {
			debugLog("Game API", gameApi.url, err.message);
			response.status(504).json({ message: "Game API offline" });
			if (!gameApi.timeoutStartTime) {
				gameApi.timeoutStartTime = Date.now();
			} else if (Date.now() - gameApi.timeoutStartTime > 1000 * 60) {
				delete knownGameApis[gameId];
			}
		} else if (err.response && err.response.status) {
			debugLog(
				"Game API",
				gameApi.url,
				err.message,
				`Status: ${err.response.status} ${err.response.statusText}`,
				err.response.data
			);
			response.status(err.response.status).json(err.response.data);
		} else {
			console.warn("Game API", err);
			response.status(500).json({});
		}
	}
});

const httpServer = http.createServer(app);
httpServer.listen(listenPort);
initWebsocketListener(httpServer);
console.log(`Gateway listening on port ${listenPort}`);
