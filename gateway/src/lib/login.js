const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const fs = require("fs");

const googleJWKSClient = jwksClient({
	jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
	cache: true,
});
function getGoogleJWTKey(header, callback) {
	googleJWKSClient.getSigningKey(header.kid, function(err, key) {
		if (err) {
			console.log("failed getting Google JWT Key:", err);
			callback(err);
			return;
		}
		const signingKey = key.publicKey || key.rsaPublicKey;
		callback(null, signingKey);
	});
}

function verifyGoogleJWT(token) {
	return new Promise((resolve, reject) => {
		const jwtOptions = {
			ignoreExpiration: true,
			maxAge: "7d",
		};
		jwt.verify(token, getGoogleJWTKey, jwtOptions, function(err, decoded) {
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
		try {
			const decoded = await verifyGoogleJWT(request.headers.authorization);
			if (isEmailAdmin(decoded.email)) {
				return next(); // they're allowed to use this route
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
	};
}

module.exports = {
	verifyGoogleJWT,
	getAdmins,
	isEmailAdmin,
	checkAuthMiddleware,
};
