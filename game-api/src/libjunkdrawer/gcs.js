// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'nebtown-game-backups';

async function uploadFile(gameName, filename)
{
    try {
        await storage.bucket(bucketName).upload(filename, {
            gzip: true,
            destination: gameName + "/" + filename,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });

        console.log(`${filename} uploaded to ${bucketName}.`);
        return null
    } catch (err) {
        return err
    }
}

module.exports = {
    uploadFile,
};