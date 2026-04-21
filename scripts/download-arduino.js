const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const tar = require('tar');
const {ARDUINO_CLI_URLS} = require('./platform-config');

const downloadArduinoCli = async function (platform, targetDir) {
    const downloadUrl = ARDUINO_CLI_URLS[platform];
    if (!downloadUrl) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const isZip = downloadUrl.endsWith('.zip');
    const fileName = path.basename(downloadUrl);
    const filePath = path.join(targetDir, fileName);

    try {
        await fs.ensureDir(targetDir);

        console.log(`Downloading Arduino CLI for ${platform}...`);
        console.log(`  URL: ${downloadUrl}`);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
        }

        // Save to file
        const fileStream = fs.createWriteStream(filePath);
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });

        // Extract
        console.log('Extracting Arduino CLI...');
        if (isZip) {
            await fs.createReadStream(filePath)
                .pipe(unzipper.Extract({path: targetDir}))
                .promise();
        } else {
            await tar.x({
                file: filePath,
                cwd: targetDir
            });
        }

        // Clean up downloaded archive
        await fs.unlink(filePath);

        console.log(`Arduino CLI extracted to ${targetDir}`);
    } catch (err) {
        console.error('Error downloading Arduino CLI:', err);
        process.exit(1);
    }
};

module.exports = downloadArduinoCli;
