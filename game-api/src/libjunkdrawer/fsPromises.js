const fs = require("fs");
const util = require("util");

module.exports = {
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	mkdir: util.promisify(fs.mkdir),
	access: util.promisify(fs.access),
	readdir: util.promisify(fs.readdir),
};

module.exports.exists = async fileName => {
	try {
		await module.exports.access(fileName);
		return true;
	} catch {
		return false;
	}
};
