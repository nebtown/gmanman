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
	const headers = request.headers || {};
	const queryParams = request.query || {};
	const bodyParams = request.body || {};
	let requestURL = `${gameApi.url}${endpoint}`;
	const authScheme = gameApi.authScheme;
	const authSecret = gameApi.authSecret;
	if (authScheme) {
		switch (authScheme)
		{
			case "totp":
				if (authSecret) {
					let totp = otplib.totp.generate(authSecret);
					if (request.method === "GET") {
						queryParams.totp = totp;
						bodyParams.totp = totp;
					}
				}
				break;
			case "digest":
				//Reference: https://en.wikipedia.org/wiki/Digest_access_authentication
				if (authSecret) {
					request.digestData = {
						HA2: md5(`${request.method}:${requestURL}`),
					}
				}
				break;
		}
	}
	for (let i = 0; i <= MAX_AUTH_ATTEMPTS; i++)  {
		if (i === MAX_AUTH_ATTEMPTS) {
			debugLog(
				"Game API",
				gameApi.id,
				request.method,
				gameApi.url,
				"Maximum authentication attempts reached."
			);
			response.status(502).json({ message: "Failed to authenticate with game API." });
			break;
		}
		try {
			const queryParamString = Object.keys(queryParams).length
				? "?" + querystring.stringify(queryParams)
				: "";
			const { data } = await axios({
				method: request.method,
				url: `${requestURL}${queryParamString}`,
				data: bodyParams,
				headers,
				timeout: 5000,
			});
			response.json(data);
			gameApi.timeoutStartTime = 0;
			break;
		} catch (err) {
			let retryQuery = false;
			if (err.code === "ECONNREFUSED") {
				debugLog("Game API", gameApi.url, err.message);
				response.status(504).json({ message: "Game API offline" });
				if (!gameApi.timeoutStartTime) {
					gameApi.timeoutStartTime = Date.now();
				} else if (Date.now() - gameApi.timeoutStartTime > 1000 * 60) {
					delete knownGameApis[gameId];
				}
			} else if (err.response && err.response.status) {
				const { status, statusText } = err.response;
				const responseHeaders = err.response.headers;
				const responseData = err.response.data;
				switch(status) {
					case 401:
						const authenticate = responseHeaders["WWW-Authenticate"];
						debugLog(
							"GameAPI",
							gameApi.id,
							request.method,
							gameApi.url,
							"Received unauthorized header:",
							authenticate
						);
						const authenticateMap = {}
						authenticate.split(", ").forEach((kvs) => {
							let { key, value } = kvs.split("=");
							if (key.left(7) === "Digest ") {
								key = key.substring(7);
							}
							if (value[0] === '"' && value[value.length - 1] == '"') {
								value = value.substring(1, value.length - 2);
							}
							authenticateMap[key] = value;
						});
						switch(authScheme) {
							case "digest":
								const { qop, realm, nonce } = authenticateMap;
								if (qop === "auth" && nonce) {
									const HA1 = md5(`gmanman:${realm}:${authSecret}`);
									const { HA2 } = request.digestData;
									authenticateMap.response = md5(`${HA1}:${nonce}:${HA2}`);
									headers["Authorization"] = `Digest ${authenticateMap.keys().map((key) => `${key}=${authenticateMap[key]}`).join(", ")}`
									debugLog(
										"GameAPI",
										gameApi.id,
										request.method,
										gameApi.url,
										`HA1: gmanman:${realm}:${authSecret} => ${HA1}`,
										`nonce: ${nonce}`
										`HA2: ${request.method}:${requestURL} => ${HA2}`,
										headers["Authorization"]
									);
									retryQuery = true;
								}
								else {
									debugLog(
										"Game API",
										gameApi.id,
										request.method,
										gameApi.url,
										"API registered with digest authentication, but server did not return correct authenticate header.",
										`Status: ${status} ${statusText}`,
										responseHeaders
									);
									response.status(502).json({ message: "Game API had invalid authenticate header.", responseHeaders })
								}
								break;
							default:
								debugLog(
									"Game API",
									gameApi.id,
									request.method,
									gameApi.url,
									"API returned unauthorized status, but no authentication scheme that supports re-transmission was registered.",
									`Scheme: ${authScheme}`
								);
								response.status(502).json({ message: "Game API misconfigured authentication scheme.", scheme: authScheme });
								break;
						}
						break;
					default:
						debugLog(
							"Game API",
							gameApi.url,
							err.message,
							`Status: ${status} ${statusText}`,
							responseData
						);
						response.status(status).json(responseData);
				}
			} else {
				console.warn("Game API", err);
				response.status(500).json({});
			}
			if (retryQuery) {
				continue;
			}
			break;
		}
	}
});

const httpServer = http.createServer(app);
httpServer.listen(listenPort);
initWebsocketListener(httpServer);
initPlayerStatusPoller(knownGameApis);
console.log(`Gateway listening on port ${listenPort}`);
