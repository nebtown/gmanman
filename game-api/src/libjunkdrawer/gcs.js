const { Storage } = require("@google-cloud/storage");

const storage = new Storage();
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

module.exports = {
	uploadFile,
};
