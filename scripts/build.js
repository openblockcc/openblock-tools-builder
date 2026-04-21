const fs = require('fs-extra');
const path = require('path');
const {PLATFORMS} = require('./platform-config');
const downloadArduinoCli = require('./download-arduino');
const setupArduino = require('./setup-arduino');
const downloadPython = require('./download-python');
const setupPython = require('./setup-python');
const compress = require('./compress');

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

    // Step 6: Compress
    console.log('\n[6/6] Compressing output...');
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
