const fs = require("fs");
const util = require("util");
const child_process = require("child_process");

module.exports = {
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	open: util.promisify(fs.open),
	mkdir: util.promisify(fs.mkdir),
	access: util.promisify(fs.access),
	readdir: util.promisify(fs.readdir),
	stat: util.promisify(fs.stat),
};

module.exports.exists = async (fileName) => {
	try {
		await module.exports.access(fileName);
		return true;
	} catch {
		return false;
	}
};

module.exports.spawnProcess = (cmd, args) =>
	new Promise((resolve, reject) => {
		const cp = child_process.spawn(cmd, args);
		const error = [];
		const stdout = [];
		cp.stdout.on("data", (data) => {
			stdout.push(data.toString());
		});

		cp.on("error", (e) => {
			error.push(e.toString());
		});

		cp.on("close", () => {
			if (error.length) reject(error.join(""));
			else resolve(stdout.join(""));
		});
	});
