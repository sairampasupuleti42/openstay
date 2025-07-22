#!/usr/bin/env node

/**
 * Automatic Version Bumper for Openstay
 * 
 * This script automatically increments the patch version in package.json
 * during the build process. It supports semantic versioning (major.minor.patch).
 * 
 * Usage:
 * - node scripts/bump-version.js patch  (0.0.81 -> 0.0.82)
 * - node scripts/bump-version.js minor  (0.0.81 -> 0.1.0) 
 * - node scripts/bump-version.js major  (0.0.81 -> 1.0.0)
 * 
 * Environment Variables:
 * - SKIP_VERSION_BUMP=true : Skip version bumping
 * - VERSION_BUMP_TYPE=patch|minor|major : Override bump type
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the root directory (one level up from scripts)
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

function readPackageJson() {
  try {
    const content = readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to read package.json:', error.message);
    process.exit(1);
  }
}

function writePackageJson(packageData) {
  try {
    const content = JSON.stringify(packageData, null, 2) + '\n';
    writeFileSync(packageJsonPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Failed to write package.json:', error.message);
    process.exit(1);
  }
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

function bumpVersion(currentVersion, bumpType = 'patch') {
  const { major, minor, patch } = parseVersion(currentVersion);
  
  switch (bumpType.toLowerCase()) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function main() {
  // Check if version bumping should be skipped
  if (process.env.SKIP_VERSION_BUMP === 'true') {
    console.log('⏭️  Version bumping skipped (SKIP_VERSION_BUMP=true)');
    return;
  }

  // Get bump type from command line argument or environment variable
  const bumpType = process.env.VERSION_BUMP_TYPE || process.argv[2] || 'patch';
  
  // Validate bump type
  const validBumpTypes = ['patch', 'minor', 'major'];
  if (!validBumpTypes.includes(bumpType.toLowerCase())) {
    console.error(`❌ Invalid bump type: ${bumpType}`);
    console.error(`   Valid types: ${validBumpTypes.join(', ')}`);
    process.exit(1);
  }

  console.log(`🔧 Bumping ${bumpType} version...`);

  // Read current package.json
  const packageData = readPackageJson();
  const currentVersion = packageData.version;

  if (!currentVersion) {
    console.error('❌ No version found in package.json');
    process.exit(1);
  }

  // Calculate new version
  let newVersion;
  try {
    newVersion = bumpVersion(currentVersion, bumpType);
  } catch (error) {
    console.error('❌ Version bump failed:', error.message);
    process.exit(1);
  }

  // Update package.json
  packageData.version = newVersion;
  writePackageJson(packageData);

  // Log the change
  console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
  
  // Set environment variable for use in build process
  console.log(`VITE_APP_VERSION=${newVersion}`);
  
  // Also log build timestamp
  const buildTime = new Date().toISOString();
  console.log(`VITE_BUILD_TIME=${buildTime}`);
  
  process.exit(0);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in version bumper:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection in version bumper:', reason);
  process.exit(1);
});

main();
