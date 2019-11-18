const sevenzip = require("node-7z");
const path = require("path");
const fsPromises = require("./fsPromises");

async function makeBackupsDir(gameDir) {
	const backupsDir = path.join(gameDir, "backups");
	if (!(await fsPromises.exists(backupsDir))) {
		await fsPromises.mkdir(backupsDir);
	}
	return backupsDir;
}

function generateBackupFilename(gameId, gameDir) {
	return path.resolve(
		gameDir,
		"backups",
		`${gameId}-${new Date().toISOString()}.7z`
	);
}

async function makeBackup(backupFile, gameDir, filesToBackup) {
	await makeBackupsDir(gameDir);

	const cwd = process.cwd();
	process.chdir(gameDir);
	const stream = sevenzip.add(backupFile, filesToBackup, {
		timeStats: true,
	});
	process.chdir(cwd);

	return new Promise((resolve, reject) => {
		stream.on("end", resolve);
		stream.on("error", err => {
			if (err.message === "unknown error" && err.stderr) {
				err.message = err.stderr.trim().replace("\n", " ");
			}
			reject(err);
		});
	});
}

function extractArchive(archiveFile, destinationDir) {
	sevenzip.extractFull(archiveFile, destinationDir);
}

module.exports = {
	generateBackupFilename,
	makeBackupsDir,
	makeBackup,
	extractArchive,
};
