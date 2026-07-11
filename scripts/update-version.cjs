const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error("Error: Please provide a version string (e.g. 0.0.6).");
  process.exit(1);
}

const semverRegex = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$/;
if (!semverRegex.test(version)) {
  console.error(`Error: Invalid version format '${version}'. Must be a valid semver (e.g. 1.0.0 or 1.0.0-alpha.1).`);
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');

// 1. Update src/lib/version.ts
const versionTsPath = path.join(rootDir, 'src/lib/version.ts');
const versionTsContent = `export const APP_VERSION = "${version}";
export const PRODUCT_NAME = "Teebot Flow";
export const DEVELOPER = "Teebot Labs";
`;
fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
console.log(`Updated ${versionTsPath} to version: ${version}`);

// 2. Update package.json
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`Updated ${packageJsonPath} to version: ${version}`);
} else {
  console.warn(`Warning: package.json not found at ${packageJsonPath}`);
}

// 3. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'src-tauri/tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  conf.version = version;
  fs.writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n', 'utf8');
  console.log(`Updated ${tauriConfPath} to version: ${version}`);
} else {
  console.warn(`Warning: tauri.conf.json not found at ${tauriConfPath}`);
}

// 4. Update src-tauri/Cargo.toml
const cargoTomlPath = path.join(rootDir, 'src-tauri/Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  let cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
  // Match version line inside [package] section
  cargoContent = cargoContent.replace(/^version = ".*"/m, `version = "${version}"`);
  fs.writeFileSync(cargoTomlPath, cargoContent, 'utf8');
  console.log(`Updated ${cargoTomlPath} to version: ${version}`);
} else {
  console.warn(`Warning: Cargo.toml not found at ${cargoTomlPath}`);
}

// 5. Update snap/snapcraft.yaml
const snapcraftPath = path.join(rootDir, 'snap/snapcraft.yaml');
if (fs.existsSync(snapcraftPath)) {
  let snapContent = fs.readFileSync(snapcraftPath, 'utf8');
  snapContent = snapContent.replace(/^version: '.*'/m, `version: '${version}'`);
  fs.writeFileSync(snapcraftPath, snapContent, 'utf8');
  console.log(`Updated ${snapcraftPath} to version: ${version}`);
} else {
  console.warn(`Warning: snapcraft.yaml not found at ${snapcraftPath}`);
}

