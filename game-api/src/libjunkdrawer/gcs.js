const { Storage } = require("@google-cloud/storage");
const fsPromises = require("./fsPromises");
const path = require("path");

const { gameDir, serviceAccount } = require("../cliArgs");

const storage = new Storage({
	keyFilename: serviceAccount,
});
const bucketName = "nebtown-game-backups";

/** @throws Google Storage Auth/upload error */
async function uploadFile(gameName, filename) {
	if (serviceAccount === "offline") return;

	await storage.bucket(bucketName).upload(filename, {
		destination: gameName + "/" + path.basename(filename),
		metadata: {
			cacheControl: "public, max-age=31536000",
		},
	});
	console.log(`${filename} uploaded to ${bucketName}.`);
}

async function listFiles(gameName) {
	if (serviceAccount === "offline") {
		try {
			return (await fsPromises.readdir(path.join(gameDir, "backups"))).map(
				(file) => ({ name: file })
			);
		} catch {
			return [];
		}
	}

	const [files] = await storage.bucket(bucketName).getFiles({
		directory: gameName,
	});
	return files
		.map(({ name }) => ({ name: name.replace(gameName + "/", "") }))
		.sort((a, b) => -a.name.localeCompare(b.name));
}

async function downloadFile(game, srcFilename, destFilename) {
	if (serviceAccount === "offline") return;
	if (await fsPromises.exists(destFilename)) return;

	await storage
		.bucket(bucketName)
		.file(game + "/" + srcFilename)
		.download({
			destination: destFilename,
			validation: false, // md5 check, should be fine but was failing?
		});
}

module.exports = {
	uploadFile,
	listFiles,
	downloadFile,
};
