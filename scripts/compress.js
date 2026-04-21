const {execSync} = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const {add} = require('node-7z');
const {path7za} = require('7zip-bin');

const compress = async function (platform, version, distDir, outputDir) {
    const archiveName = `openblock-tools-${platform}-v${version}.7z`;
    const archivePath = path.resolve(outputDir, archiveName);
    const checksumPath = `${archivePath}.sha256`;

    try {
        await fs.ensureDir(outputDir);

        // Ensure 7za binary is executable (macOS/Linux)
        if (process.platform !== 'win32') {
            try {
                execSync(`chmod +x "${path7za}"`);
            } catch (_) {
                // ignore if chmod fails
            }
        }

        // Create .7z archive from dist directory
        console.log(`Compressing ${distDir} -> ${archivePath}`);

        await new Promise((resolve, reject) => {
            const stream = add(archivePath, path.join(distDir, '*'), {
                $bin: path7za,
                recursive: true
            });
            stream.on('end', resolve);
            stream.on('error', reject);
        });

        // Verify archive was created
        if (!await fs.pathExists(archivePath)) {
            throw new Error(`Archive not created: ${archivePath}`);
        }

        const stats = await fs.stat(archivePath);
        console.log(`Archive created: ${archiveName} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

        // Calculate SHA256 checksum
        console.log('Calculating SHA256 checksum...');
        const hash = crypto.createHash('sha256');
        const fileStream = fs.createReadStream(archivePath);

        const checksum = await new Promise((resolve, reject) => {
            fileStream.on('data', chunk => hash.update(chunk));
            fileStream.on('end', () => resolve(hash.digest('hex')));
            fileStream.on('error', reject);
        });

        // Write checksum file (sha256sum format: "hash  filename")
        const checksumContent = `${checksum}  ${archiveName}\n`;
        await fs.writeFile(checksumPath, checksumContent);
        console.log(`Checksum: ${checksum}`);
        console.log(`Checksum file: ${path.basename(checksumPath)}`);

    } catch (err) {
        console.error('Error compressing:', err);
        process.exit(1);
    }
};

module.exports = compress;
