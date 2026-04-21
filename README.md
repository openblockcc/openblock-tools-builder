# openblock-tools-builder

Automated builder for OpenBlock binary tools across platforms. Packages Arduino CLI and portable Python with essential packages, then publishes platform-specific archives via GitHub Releases.

## Tool List

- **Arduino CLI** (latest)

    Includes builtin tools (serial-discovery, mdns-discovery, serial-monitor, dfu-discovery, ctags) and the official Arduino package/library index files. Board packages and third-party board manager URLs are NOT included — they are configured and downloaded on-demand by the application.

- **Python 3.12** (via [python-build-standalone](https://github.com/indygreg/python-build-standalone))

    Packages:

    | Name | Description |
    |------|-------------|
    | uflash | micro:bit flashing |
    | microfs | micro:bit filesystem |
    | esptool | ESP32/ESP8266 flashing |
    | kflash | K210 flashing |
    | openblock-obmpy | OpenBlock MicroPython |

## Supported Platforms

| Platform | Description |
|----------|-------------|
| win32-x64 | Windows x64 |
| darwin-x64 | macOS x64 (Intel) |
| darwin-arm64 | macOS ARM64 (Apple Silicon) |
| linux-x64 | Linux x64 |
| linux-arm64 | Linux ARM64 |
| linux-arm | Linux ARMv7 |

## Usage

### Local Build

```bash
npm install
node scripts/build.js --platform win32-x64 --version 3.0.0
```

Or use npm scripts:

```bash
npm run build:win32-x64
npm run build:darwin-arm64
npm run build:linux-x64
```

Output files are placed in the `output/` directory:
- `openblock-tools-{platform}-v{version}.7z` — the archive
- `openblock-tools-{platform}-v{version}.7z.sha256` — SHA256 checksum

### Automated Build (GitHub Actions)

Push a version tag to trigger builds for all platforms:

```bash
git tag v3.0.0
git push origin v3.0.0
```

Or use **workflow_dispatch** to manually trigger a build from the GitHub Actions UI.

## Output Package Structure

```
Arduino/
├── arduino-cli[.exe]
├── arduino-cli.yaml
├── LICENSE.txt
├── package_index.json
├── library_index.json
└── packages/
    └── builtin/
        └── tools/
            ├── serial-discovery/
            ├── mdns-discovery/
            ├── serial-monitor/
            ├── dfu-discovery/
            └── ctags/
Python/
├── python[.exe]           (Windows)
├── python3                (macOS symlink -> bin/python3)
├── bin/                   (macOS/Linux)
│   ├── python3
│   ├── esptool.py
│   └── ...
├── Scripts/               (Windows)
│   ├── esptool.exe
│   └── ...
└── lib/ or Lib/
    └── site-packages/
```
