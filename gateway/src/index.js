const express = require("express");
const pretty = require("express-prettify");
const http = require("http");
const cors = require("cors");
const axios = require("axios");
const querystring = require("querystring");
const otplib = require("otplib");
const md5 = require("md5");

const MAX_AUTH_ATTEMPTS = 5;

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
	initPlayerStatusPoller,
} = require("./routes/messages");
app.use("/messages", messagesRouter);

const {
	spawningPoolRouter,
	initSpawningPool,
} = require("./routes/spawningPool");
app.use("/spawningPool", spawningPoolRouter);

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
		games: Object.values(knownGameApis)
			.sort(
				(a, b) =>
					(b.lastRunningTime || 0) - (a.lastRunningTime || 0) ||
					a.game.localeCompare(b.game) ||
					a.name.localeCompare(b.name)
			)
			.map(({ game, gameId, name, connectUrl, features }) => ({
				game,
				id: gameId, // todo: remove once new UI deployed
				gameId,
				name,
				connectUrl,
				features,
			})),
	});
});
/**
 * {
		game: "factorio",
		gameId: "factorio-angelbob",
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
	const id = request.body.gameId || request.body.id;
	knownGameApis[id] = {
		gameId: id,
		...request.body,
		timeoutStartTime: 0,
		lastRunningTime: knownGameApis[id] ? knownGameApis[id].lastRunningTime : 0,
	};
	debugLog(`Registered ${id}`, request.body);
	response.json({});
});

app.all("/:gameId/*", async (request, response) => {
	const { gameId, 0: endpoint } = request.params;
	const gameApi = knownGameApis[gameId];
	if (!gameApi) {
		return response.status(404).json({ error: "GameIdNotFound" });
	}
	const headers = request.headers || {};
	const queryParams = request.query || {};
	const bodyParams =
		request.body && Object.values(request.body).length
			? request.body
			: undefined;
	let requestURL = `${gameApi.url}${endpoint}`;
	const extraAxiosOptions = {};
	if (endpoint.startsWith("mods/pack")) {
		extraAxiosOptions.responseType = "stream";
		extraAxiosOptions.decompress = false;
		extraAxiosOptions.timeout = 25000;
	}
	try {
		const queryParamString = Object.keys(queryParams).length
			? "?" + querystring.stringify(queryParams)
			: "";
		const { data, headers: responseHeaders } = await axios({
			method: request.method,
			url: `${requestURL}${queryParamString}`,
			data: bodyParams,
			headers,
			timeout: 5000,
			...extraAxiosOptions,
		});

		if (extraAxiosOptions.responseType === "stream") {
			for (const headerName of [
				"content-disposition",
				"content-type",
				"content-length",
			]) {
				response.setHeader(headerName, responseHeaders[headerName]);
			}
			data.pipe(response); // for file transfers, like modPacks
		} else {
			response.json(data);
		}
		gameApi.timeoutStartTime = 0;
	} catch (err) {
		if (err.code === "ECONNREFUSED") {
			debugLog("Game API ECONNREFUSED", gameApi.url, err.message);
			response.status(504).json({ message: "Game API offline" });
			if (!gameApi.timeoutStartTime) {
				gameApi.timeoutStartTime = Date.now();
			} else if (Date.now() - gameApi.timeoutStartTime > 1000 * 60) {
				delete knownGameApis[gameId];
			}
		} else if (err.response && err.response.status) {
			const { status, statusText } = err.response;
			const responseHeaders = err.response.headers;
			let responseData = err.response.data;
			switch (status) {
				case 502:
					debugLog("Game API 502", gameApi.url, err.message);
					response.status(504).json({ message: "Game API offline" });
					if (!gameApi.timeoutStartTime) {
						gameApi.timeoutStartTime = Date.now();
					} else if (Date.now() - gameApi.timeoutStartTime > 1000 * 60) {
						delete knownGameApis[gameId];
					}
					break;
				default:
					if (extraAxiosOptions.responseType === "stream") {
						responseData = await streamToString(responseData);
					}
					if (status !== 304) {
						debugLog(
							"Game API",
							requestURL,
							err.message,
							`Status: ${status} ${statusText}`,
							responseData,
							responseHeaders
						);
					}
					response.status(status).json(responseData);
			}
		} else {
			console.warn("Game API 500", err);
			response.status(500).json({});
		}
	}
});

function streamToString(stream) {
	const chunks = [];
	return new Promise((resolve, reject) => {
		stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		stream.on("error", (err) => reject(err));
		stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
	});
}

const httpServer = http.createServer(app);
httpServer.listen(listenPort);
initWebsocketListener(httpServer);
initPlayerStatusPoller(knownGameApis);
initSpawningPool();
console.log(`Gateway listening on port ${listenPort}`);
