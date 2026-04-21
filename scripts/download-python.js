const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');
const {PYTHON_VERSION, PYTHON_PLATFORM_MAP} = require('./platform-config');

const GITHUB_API = 'https://api.github.com/repos/indygreg/python-build-standalone/releases';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options, retries = MAX_RETRIES) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return response;
        } catch (err) {
            console.warn(`  Fetch attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt === retries) throw err;
            console.log(`  Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await sleep(RETRY_DELAY_MS);
        }
    }
};

/**
 * Find the latest python-build-standalone release that contains assets for the
 * requested Python major.minor version and platform.
 */
const findPythonAsset = async function (platform) {
    const platformPattern = PYTHON_PLATFORM_MAP[platform];
    if (!platformPattern) {
        throw new Error(`No python-build-standalone mapping for platform: ${platform}`);
    }

    console.log(`Searching python-build-standalone releases for Python ${PYTHON_VERSION} / ${platformPattern}...`);

    const headers = {'User-Agent': 'openblock-tools-builder'};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetchWithRetry(`${GITHUB_API}?per_page=10`, {headers});
    const releases = await response.json();

    for (const release of releases) {
        // Look for an asset matching our Python version and platform
        const assetPattern = new RegExp(
            `cpython-${PYTHON_VERSION}\\.\\d+.*-${platformPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.tar\\.gz$`
        );

        const asset = release.assets.find(a => assetPattern.test(a.name));
        if (asset) {
            console.log(`  Found: ${asset.name} (${release.tag_name})`);
            return {
                url: asset.browser_download_url,
                name: asset.name
            };
        }
    }

    throw new Error(
        `Could not find python-build-standalone asset for Python ${PYTHON_VERSION} / ${platformPattern}`
    );
};

const downloadPython = async function (platform, targetDir) {
    const isWindows = platform.startsWith('win32');
    const isDarwin = platform.startsWith('darwin');

    try {
        const asset = await findPythonAsset(platform);

        await fs.ensureDir(targetDir);
        const filePath = path.join(targetDir, asset.name);

        // Download
        console.log(`Downloading ${asset.name}...`);
        const headers = {'User-Agent': 'openblock-tools-builder'};
        if (process.env.GITHUB_TOKEN) {
            headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
        }
        const response = await fetchWithRetry(asset.url, {headers});

        const fileStream = fs.createWriteStream(filePath);
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });

        // Extract — python-build-standalone archives contain a `python/` directory
        console.log('Extracting Python...');
        const extractDir = path.join(targetDir, '_extract_tmp');
        await fs.ensureDir(extractDir);

        await tar.x({
            file: filePath,
            cwd: extractDir
        });

        // Move `python/` contents up to targetDir
        const pythonSubdir = path.join(extractDir, 'python');
        if (await fs.pathExists(pythonSubdir)) {
            const entries = await fs.readdir(pythonSubdir);
            for (const entry of entries) {
                await fs.move(
                    path.join(pythonSubdir, entry),
                    path.join(targetDir, entry),
                    {overwrite: true}
                );
            }
        } else {
            // Fallback: move everything from extract dir
            const entries = await fs.readdir(extractDir);
            for (const entry of entries) {
                await fs.move(
                    path.join(extractDir, entry),
                    path.join(targetDir, entry),
                    {overwrite: true}
                );
            }
        }

        // Clean up
        await fs.remove(extractDir);
        await fs.unlink(filePath);

        // macOS: create symlink Python/python3 -> bin/python3
        // Consumer expects Python/python3 on darwin
        if (isDarwin) {
            const symlinkTarget = path.join(targetDir, 'python3');
            const binPython = path.join('bin', 'python3');
            if (!await fs.pathExists(symlinkTarget)) {
                console.log('Creating macOS symlink: python3 -> bin/python3');
                await fs.symlink(binPython, symlinkTarget);
            }
        }

        // Verify the Python binary exists
        let pythonBin;
        if (isWindows) {
            pythonBin = path.join(targetDir, 'python.exe');
        } else {
            pythonBin = path.join(targetDir, 'bin', 'python3');
        }

        if (!await fs.pathExists(pythonBin)) {
            throw new Error(`Python binary not found at expected path: ${pythonBin}`);
        }

        console.log(`Python extracted to ${targetDir}`);
    } catch (err) {
        console.error('Error downloading Python:', err);
        process.exit(1);
    }
};

module.exports = downloadPython;
