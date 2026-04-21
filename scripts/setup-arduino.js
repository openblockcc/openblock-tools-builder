const {execSync} = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const {REQUIRED_BUILTIN_TOOLS} = require('./platform-config');

/**
 * Run a command, tolerating non-zero exit codes.
 * arduino-cli returns non-zero when some (not all) indexes fail to download,
 * but it still completes the work it can. We log the warning and continue.
 */
const execTolerant = (cmd, label) => {
    try {
        execSync(cmd, {stdio: 'inherit'});
    } catch (err) {
        console.warn(`Warning: ${label} exited with code ${err.status} (partial failure is expected if some index URLs are unreachable)`);
    }
};

const setupArduino = async function (platform, targetDir, configTemplate) {
    const isWindows = platform.startsWith('win32');
    const cliBinary = path.resolve(targetDir, isWindows ? 'arduino-cli.exe' : 'arduino-cli');
    const configFile = path.resolve(targetDir, 'arduino-cli.yaml');
    const dataDir = path.resolve(targetDir);

    try {
        // Verify arduino-cli binary exists
        if (!await fs.pathExists(cliBinary)) {
            throw new Error(`Arduino CLI binary not found: ${cliBinary}`);
        }

        // Make binary executable on non-Windows
        if (!isWindows) {
            await fs.chmod(cliBinary, 0o755);
        }

        // Copy and configure arduino-cli.yaml
        console.log('Configuring Arduino CLI...');
        let configContent = await fs.readFile(configTemplate, 'utf8');

        // Use forward slashes for paths (arduino-cli handles both on Windows)
        const dataDirNormalized = dataDir.replace(/\\/g, '/');
        configContent = configContent
            .replace(/\{DATA_DIR\}/g, dataDirNormalized);

        await fs.writeFile(configFile, configContent);
        console.log(`  Config written to ${configFile}`);

        // Run core update-index to generate package and library index files.
        // Some third-party index URLs may be unreachable — that's OK, we still
        // get the official Arduino index and whichever others succeed.
        console.log('Running arduino-cli core update-index...');
        execTolerant(
            `"${cliBinary}" core update-index --config-file "${configFile}"`,
            'core update-index'
        );

        // Trigger builtin tools download by running board list.
        // This also re-runs update-index internally — tolerate partial failures.
        console.log('Triggering builtin tools download (board list)...');
        execTolerant(
            `"${cliBinary}" board list --config-file "${configFile}"`,
            'board list'
        );

        // Verify builtin tools were installed
        const builtinToolsDir = path.join(targetDir, 'packages', 'builtin', 'tools');
        if (!await fs.pathExists(builtinToolsDir)) {
            throw new Error(`Builtin tools directory not found: ${builtinToolsDir}`);
        }

        const installedTools = await fs.readdir(builtinToolsDir);
        const missingTools = REQUIRED_BUILTIN_TOOLS.filter(
            tool => !installedTools.includes(tool)
        );
        if (missingTools.length > 0) {
            throw new Error(`Missing required builtin tools: ${missingTools.join(', ')}. Available: ${installedTools.join(', ')}`);
        }
        console.log(`Builtin tools verified: ${installedTools.join(', ')}`);

        // Clean up staging directory (downloaded caches)
        const stagingDir = path.join(targetDir, 'staging');
        if (await fs.pathExists(stagingDir)) {
            console.log('Cleaning up staging directory...');
            await fs.remove(stagingDir);
        }

        // Clean up tmp directory
        const tmpDir = path.join(targetDir, 'tmp');
        if (await fs.pathExists(tmpDir)) {
            await fs.remove(tmpDir);
        }

        console.log('Arduino CLI setup complete.');
    } catch (err) {
        console.error('Error setting up Arduino CLI:', err);
        process.exit(1);
    }
};

module.exports = setupArduino;
