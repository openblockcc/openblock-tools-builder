/**
 * Central configuration for all platform-specific mappings.
 * Single source of truth for download URLs, platform identifiers, and package lists.
 */

const PLATFORMS = {
    'win32-x64': {os: 'win32', arch: 'x64'},
    'darwin-x64': {os: 'darwin', arch: 'x64'},
    'darwin-arm64': {os: 'darwin', arch: 'arm64'},
    'linux-x64': {os: 'linux', arch: 'x64'},
    'linux-arm64': {os: 'linux', arch: 'arm64'},
    'linux-arm': {os: 'linux', arch: 'arm'}
};

const ARDUINO_CLI_URLS = {
    'win32-x64': 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip',
    'darwin-x64': 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz',
    'darwin-arm64': 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_ARM64.tar.gz',
    'linux-x64': 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz',
    'linux-arm64': 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_ARM64.tar.gz',
    'linux-arm': 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_ARMv7.tar.gz'
};

// python-build-standalone asset name patterns (install_only_stripped variant)
const PYTHON_VERSION = '3.12';

const PYTHON_PLATFORM_MAP = {
    'win32-x64': 'x86_64-pc-windows-msvc-install_only_stripped',
    'darwin-x64': 'x86_64-apple-darwin-install_only_stripped',
    'darwin-arm64': 'aarch64-apple-darwin-install_only_stripped',
    'linux-x64': 'x86_64-unknown-linux-gnu-install_only_stripped',
    'linux-arm64': 'aarch64-unknown-linux-gnu-install_only_stripped',
    'linux-arm': 'armv7-unknown-linux-gnueabihf-install_only_stripped'
};

const PIP_PACKAGES = [
    'uflash',
    'microfs',
    'esptool',
    'kflash',
    'openblock-obmpy'
];

// Builtin tools that must exist after Arduino CLI setup
const REQUIRED_BUILTIN_TOOLS = [
    'serial-discovery',
    'mdns-discovery',
    'serial-monitor',
    'dfu-discovery',
    'ctags'
];

module.exports = {
    PLATFORMS,
    ARDUINO_CLI_URLS,
    PYTHON_VERSION,
    PYTHON_PLATFORM_MAP,
    PIP_PACKAGES,
    REQUIRED_BUILTIN_TOOLS
};
