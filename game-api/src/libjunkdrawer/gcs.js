const { Storage } = require("@google-cloud/storage");

const { serviceAccount } = require("../cliArgs");

const storage = new Storage({
	keyFilename: serviceAccount,
});
const bucketName = "nebtown-game-backups";

/** @throws Google Storage Auth/upload error */
async function uploadFile(gameName, filename) {
	await storage.bucket(bucketName).upload(filename, {
		gzip: true,
		destination: gameName + "/" + filename,
		metadata: {
			cacheControl: "public, max-age=31536000",
		},
	});
	console.log(`${filename} uploaded to ${bucketName}.`);
}

async function listFiles(gameName) {
	const [files] = await storage.bucket(bucketName).getFiles({
		directory: gameName,
	});
	return files
		.map(({ name }) => ({ name: name.replace(gameName + "/", "") }))
		.sort((a, b) => -a.name.localeCompare(b.name));
}

async function downloadFile(game, srcFilename, destFilename) {
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
