const argv = require("minimist")(process.argv.slice(2));

function debugLog(...args) {
	if (argv.v) {
		console.log(...args);
	}
}

module.exports = {
	argv,
	debugLog,
	listenPort: argv.port || 6725,
};
