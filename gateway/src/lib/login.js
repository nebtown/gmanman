const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const fs = require("fs");

const googleJWKSClient = jwksClient({
	jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
	cache: true,
});
async function getGoogleJWTKey(header, callback) {
	try {
		const key = await googleJWKSClient.getSigningKey(header.kid);
		const signingKey = key.publicKey || key.rsaPublicKey;
		callback(null, signingKey);
	} catch (err) {
		console.log("failed getting Google JWT Key:", err);
		callback(err);
	}
}

function verifyGoogleJWT(token) {
	return new Promise((resolve, reject) => {
		const jwtOptions = {
			ignoreExpiration: true,
			maxAge: "7d",
		};
		jwt.verify(token, getGoogleJWTKey, jwtOptions, function (err, decoded) {
			if (err) {
				reject(err);
			} else {
				resolve(decoded);
			}
		});
	});
}

function getAdmins() {
	try {
		return JSON.parse(fs.readFileSync("admins.json").toString());
	} catch (e) {
		console.warn("Unable to parse admins.json");
		return [];
	}
}
function isEmailAdmin(email) {
	return getAdmins().includes(email);
}

function routeInRoutesList(routesList, request) {
	return routesList.some(
		([method, urlPattern]) =>
			request.method === method && request.originalUrl.includes(urlPattern)
	);
}

function checkAuthMiddleware(adminRoutes) {
	return async (request, response, next) => {
		if (!routeInRoutesList(adminRoutes, request)) {
			return next(); // route doesn't need auth
		}
		if (await checkAuth(request, response, next)) {
			next(); // they're allowed to use this route
		}
	};
}

async function checkAuth(request, response, next) {
	try {
		const decoded = await verifyGoogleJWT(request.headers.authorization);
		if (isEmailAdmin(decoded.email)) {
			return true;
		}
		console.warn(
			`Rejecting unauthorized ${request.method} ${request.originalUrl}`,
			` for ${decoded.email}`
		);
	} catch {
		console.warn(
			`Rejecting unauthenticated ${request.method} ${request.originalUrl}`
		);
	}
	response.status(403).json({ error: "Unauthorized" });
	next("Unauthorized");
	return false;
}

module.exports = {
	verifyGoogleJWT,
	getAdmins,
	isEmailAdmin,
	checkAuthMiddleware,
	checkAuth,
};
