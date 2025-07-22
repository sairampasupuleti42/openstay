#!/usr/bin/env node

/**
 * Smart Version Manager for Openstay
 * 
 * This script only increments the version when actual code changes are detected
 * since the last version bump. It uses Git to detect changes and ensures
 * versions are only bumped for meaningful releases.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

function runGitCommand(command) {
  try {
    return execSync(command, { 
      cwd: rootDir, 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch (error) {
    return null;
  }
}

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

function getLastVersionTag() {
  // Get the last version tag
  const lastTag = runGitCommand('git describe --tags --abbrev=0 --match="v*" 2>/dev/null');
  if (lastTag) {
    return lastTag.replace(/^v/, ''); // Remove 'v' prefix
  }
  
  // If no tags exist, check if there are any commits at all
  const hasCommits = runGitCommand('git rev-list --count HEAD 2>/dev/null');
  if (hasCommits && parseInt(hasCommits) > 0) {
    return '0.0.0'; // First version if commits exist but no tags
  }
  
  return null; // No commits, no version needed
}

function hasCodeChangesSinceLastVersion() {
  const lastVersionTag = getLastVersionTag();
  
  if (!lastVersionTag) {
    // No previous version tag found, check if there are any commits
    const hasCommits = runGitCommand('git rev-list --count HEAD 2>/dev/null');
    return hasCommits && parseInt(hasCommits) > 0;
  }
  
  // Check for changes since last version tag
  const tagExists = runGitCommand(`git tag -l "v${lastVersionTag}"`);
  if (!tagExists) {
    // Tag doesn't exist, assume changes
    return true;
  }
  
  // Get commits since last version tag, excluding package.json version-only changes
  const changesSinceTag = runGitCommand(`git rev-list v${lastVersionTag}..HEAD --count 2>/dev/null`);
  
  if (!changesSinceTag || parseInt(changesSinceTag) === 0) {
    return false;
  }
  
  // Check if changes are only version bumps in package.json
  const commitsSinceTag = runGitCommand(`git log v${lastVersionTag}..HEAD --oneline 2>/dev/null`);
  if (!commitsSinceTag) {
    return false;
  }
  
  // Get actual file changes (excluding package.json version changes)
  const fileChanges = runGitCommand(`git diff v${lastVersionTag}..HEAD --name-only 2>/dev/null`);
  if (!fileChanges) {
    return false;
  }
  
  const changedFiles = fileChanges.split('\n').filter(file => file.trim());
  
  // If only package.json changed, check if it's only the version field
  if (changedFiles.length === 1 && changedFiles[0] === 'package.json') {
    const packageDiff = runGitCommand(`git diff v${lastVersionTag}..HEAD package.json 2>/dev/null`);
    // If diff only contains version changes, consider it no real changes
    if (packageDiff && packageDiff.includes('"version":') && 
        !packageDiff.split('\n').some(line => 
          line.startsWith('+') && 
          !line.includes('"version":') && 
          line.trim() !== '+'
        )) {
      return false;
    }
  }
  
  return changedFiles.length > 0;
}

function createVersionTag(version) {
  try {
    const tagName = `v${version}`;
    runGitCommand(`git tag -a "${tagName}" -m "Release version ${version}"`);
    console.log(`📌 Created tag: ${tagName}`);
    return true;
  } catch (error) {
    console.warn('⚠️  Could not create git tag:', error.message);
    return false;
  }
}

function main() {
  const bumpType = process.argv[2] || 'patch';
  const forceMode = process.argv.includes('--force');
  
  console.log('🔍 Checking for code changes...');
  
  // Check if we're in a git repository
  const isGitRepo = runGitCommand('git rev-parse --git-dir 2>/dev/null');
  if (!isGitRepo) {
    console.log('⚠️  Not a git repository, proceeding with version bump...');
  } else if (!forceMode && !hasCodeChangesSinceLastVersion()) {
    console.log('✅ No code changes detected since last version.');
    console.log('💡 Use --force to bump version anyway.');
    process.exit(0);
  }
  
  // Read current package.json
  const packageData = readPackageJson();
  const currentVersion = packageData.version || '0.0.0';
  
  console.log(`🔧 Code changes detected, bumping ${bumpType} version...`);
  
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
  
  // Create git tag if in git repo
  if (isGitRepo) {
    createVersionTag(newVersion);
  }
  
  // Log the change
  console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
  
  // Export environment variables for build process
  const buildTime = new Date().toISOString();
  console.log(`VITE_APP_VERSION=${newVersion}`);
  console.log(`VITE_BUILD_TIME=${buildTime}`);
  
  process.exit(0);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Version manager failed:', error.message);
  process.exit(1);
});

main();
