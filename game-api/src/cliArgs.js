const path = require("path");
const argv = require("minimist")(process.argv.slice(2));

function debugLog(...args) {
	if (argv.v) {
		console.log(...args);
	}
}

const game = argv.game || "minecraft";
const gameId = argv.gameId || game;

module.exports = {
	argv,
	game,
	gameId,
	gameName: argv.gameName || gameId,
	urlRoot: argv.urlRoot || `https://gmanman.nebtown.info/${gameId}/`,
	gameDir: argv.dir ? path.join(argv.dir) : path.join(__dirname, "../"),
	debugLog,
	listenPort: argv.port || 6725,
	gatewayUrl: argv.gateway || "https://gmanman.nebtown.info/gateway/register/",
	connectUrl: argv.connectUrl,
};
