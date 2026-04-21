const {execSync} = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const {PIP_PACKAGES} = require('./platform-config');

const setupPython = async function (platform, targetDir) {
    const isWindows = platform.startsWith('win32');

    let pythonBin;
    if (isWindows) {
        pythonBin = path.resolve(targetDir, 'python.exe');
    } else {
        pythonBin = path.resolve(targetDir, 'bin', 'python3');
    }

    try {
        if (!await fs.pathExists(pythonBin)) {
            throw new Error(`Python binary not found: ${pythonBin}`);
        }

        // Make sure pip is available
        console.log('Verifying pip...');
        execSync(`"${pythonBin}" -m pip --version`, {stdio: 'inherit'});

        // Upgrade pip first
        console.log('Upgrading pip...');
        execSync(
            `"${pythonBin}" -m pip install --upgrade pip --no-warn-script-location`,
            {stdio: 'inherit'}
        );

        // Install packages
        const packages = PIP_PACKAGES.join(' ');
        console.log(`Installing packages: ${packages}`);
        execSync(
            `"${pythonBin}" -m pip install ${packages} --no-warn-script-location`,
            {stdio: 'inherit'}
        );

        // Verify installed packages
        console.log('Verifying installed packages...');
        execSync(`"${pythonBin}" -m pip list`, {stdio: 'inherit'});

        console.log('Python setup complete.');
    } catch (err) {
        console.error('Error setting up Python:', err);
        process.exit(1);
    }
};

module.exports = setupPython;
