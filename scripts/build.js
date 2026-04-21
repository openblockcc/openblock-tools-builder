const {execSync} = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const {PLATFORMS, PIP_PACKAGES} = require('./platform-config');
const downloadArduinoCli = require('./download-arduino');
const setupArduino = require('./setup-arduino');
const downloadPython = require('./download-python');
const setupPython = require('./setup-python');
const compress = require('./compress');

/**
 * Collect version info from the built artifacts for release notes.
 */
const collectBuildInfo = (platform, arduinoDir, pythonDir) => {
    const isWindows = platform.startsWith('win32');
    const cliBinary = path.join(arduinoDir, isWindows ? 'arduino-cli.exe' : 'arduino-cli');
    const pythonBin = isWindows
        ? path.join(pythonDir, 'python.exe')
        : path.join(pythonDir, 'bin', 'python3');

    // Arduino CLI version
    let arduinoVersion = 'unknown';
    try {
        const out = execSync(`"${cliBinary}" version --format json`, {encoding: 'utf8'});
        const info = JSON.parse(out);
        arduinoVersion = info.VersionString || info.Version || out.trim();
    } catch (_) {
        try {
            arduinoVersion = execSync(`"${cliBinary}" version`, {encoding: 'utf8'}).trim();
        } catch (__) { /* ignore */ }
    }

    // Builtin tools
    const builtinTools = [];
    const builtinDir = path.join(arduinoDir, 'packages', 'builtin', 'tools');
    if (fs.pathExistsSync(builtinDir)) {
        for (const tool of fs.readdirSync(builtinDir)) {
            const toolPath = path.join(builtinDir, tool);
            if (fs.statSync(toolPath).isDirectory()) {
                const versions = fs.readdirSync(toolPath).filter(
                    v => fs.statSync(path.join(toolPath, v)).isDirectory()
                );
                builtinTools.push({name: tool, version: versions.join(', ')});
            }
        }
    }

    // Python version
    let pythonVersion = 'unknown';
    try {
        pythonVersion = execSync(`"${pythonBin}" --version`, {encoding: 'utf8'}).trim().replace('Python ', '');
    } catch (_) { /* ignore */ }

    // Pip packages
    const pipPackages = [];
    try {
        const pipList = execSync(`"${pythonBin}" -m pip list --format json`, {encoding: 'utf8'});
        const allPackages = JSON.parse(pipList);
        // Only include the packages we explicitly installed (and their key deps)
        for (const pkg of allPackages) {
            pipPackages.push({name: pkg.name, version: pkg.version});
        }
    } catch (_) { /* ignore */ }

    return {
        platform,
        arduinoCli: {
            version: arduinoVersion,
            builtinTools
        },
        python: {
            version: pythonVersion,
            packages: pipPackages
        }
    };
};

// Parse command-line arguments
const parseArgs = () => {
    const args = {};
    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === '--platform' && process.argv[i + 1]) {
            args.platform = process.argv[++i];
        } else if (process.argv[i] === '--version' && process.argv[i + 1]) {
            args.version = process.argv[++i];
        }
    }
    return args;
};

const main = async () => {
    const args = parseArgs();

    if (!args.platform) {
        console.error('Usage: node scripts/build.js --platform <platform> [--version <version>]');
        console.error(`Available platforms: ${Object.keys(PLATFORMS).join(', ')}`);
        process.exit(1);
    }

    if (!PLATFORMS[args.platform]) {
        console.error(`Unknown platform: ${args.platform}`);
        console.error(`Available platforms: ${Object.keys(PLATFORMS).join(', ')}`);
        process.exit(1);
    }

    // Read version from package.json if not provided
    const packageJson = require('../package.json');
    const version = args.version || packageJson.version;
    const platform = args.platform;

    const projectRoot = path.resolve(__dirname, '..');
    const distDir = path.join(projectRoot, 'dist');
    const outputDir = path.join(projectRoot, 'output');
    const arduinoDir = path.join(distDir, 'Arduino');
    const pythonDir = path.join(distDir, 'Python');
    const configTemplate = path.join(projectRoot, 'config', 'arduino-cli.yaml');

    console.log('='.repeat(60));
    console.log(`openblock-tools-builder`);
    console.log(`  Platform: ${platform}`);
    console.log(`  Version:  ${version}`);
    console.log('='.repeat(60));

    // Step 1: Clean
    console.log('\n[1/6] Cleaning dist/ and output/ directories...');
    await fs.remove(distDir);
    await fs.remove(outputDir);

    // Step 2: Download Arduino CLI
    console.log('\n[2/6] Downloading Arduino CLI...');
    await downloadArduinoCli(platform, arduinoDir);

    // Step 3: Setup Arduino CLI (update-index + builtin tools)
    console.log('\n[3/6] Setting up Arduino CLI...');
    await setupArduino(platform, arduinoDir, configTemplate);

    // Step 4: Download Python
    console.log('\n[4/6] Downloading Python (python-build-standalone)...');
    await downloadPython(platform, pythonDir);

    // Step 5: Setup Python (install pip packages)
    console.log('\n[5/6] Installing Python packages...');
    await setupPython(platform, pythonDir);

    // Step 6: Collect build info
    console.log('\n[6/7] Collecting build info...');
    await fs.ensureDir(outputDir);
    const buildInfo = collectBuildInfo(platform, arduinoDir, pythonDir);
    await fs.writeJson(path.join(outputDir, 'build-info.json'), buildInfo, {spaces: 2});
    console.log(`  Arduino CLI: ${buildInfo.arduinoCli.version}`);
    console.log(`  Builtin tools: ${buildInfo.arduinoCli.builtinTools.map(t => `${t.name}@${t.version}`).join(', ')}`);
    console.log(`  Python: ${buildInfo.python.version}`);
    console.log(`  Pip packages: ${buildInfo.python.packages.map(p => `${p.name}==${p.version}`).join(', ')}`);

    // Step 7: Compress
    console.log('\n[7/7] Compressing output...');
    await compress(platform, version, distDir, outputDir);

    console.log('\n' + '='.repeat(60));
    console.log('Build complete!');
    console.log(`Output: ${outputDir}`);
    const outputFiles = await fs.readdir(outputDir);
    outputFiles.forEach(f => console.log(`  - ${f}`));
    console.log('='.repeat(60));
};

main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
