#!/usr/bin/env node

/**
 * Interactive Version Manager for Openstay
 * 
 * This script provides an interactive way to manage versions,
 * view version history, and configure automatic version bumping.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

function getCurrentVersion() {
  try {
    const content = readFileSync(packageJsonPath, 'utf8');
    const packageData = JSON.parse(content);
    return packageData.version;
  } catch (error) {
    console.error('❌ Failed to read current version:', error.message);
    return null;
  }
}

function runCommand(command) {
  try {
    return execSync(command, { 
      cwd: rootDir, 
      encoding: 'utf8',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    return null;
  }
}

function showCurrentStatus() {
  const currentVersion = getCurrentVersion();
  console.log('\n📦 Openstay Version Manager');
  console.log('════════════════════════════');
  console.log(`Current version: ${currentVersion || 'Unknown'}`);
  
  // Show git status if available
  try {
    const gitCommit = execSync('git rev-parse --short HEAD', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    }).trim();
    const gitBranch = execSync('git branch --show-current', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    }).trim();
    console.log(`Git commit: ${gitCommit} (${gitBranch})`);
  } catch (error) {
    console.log('Git info: Not available');
  }
  
  console.log('════════════════════════════\n');
}

function showHelp() {
  console.log(`
📖 Version Management Commands:

Manual Version Bumping:
  npm run version:patch    Increment patch version (0.0.81 → 0.0.82)
  npm run version:minor    Increment minor version (0.0.81 → 0.1.0)
  npm run version:major    Increment major version (0.0.81 → 1.0.0)

Automatic Version Bumping:
  npm run build           Automatically bumps patch version then builds
  npm run build:dev       Same as build (with auto-bump)
  npm run build:prod      Same as build (with auto-bump)

Environment Variables:
  SKIP_VERSION_BUMP=true       Skip automatic version bumping
  VERSION_BUMP_TYPE=minor      Override bump type (patch/minor/major)

Examples:
  SKIP_VERSION_BUMP=true npm run build          # Build without version bump
  VERSION_BUMP_TYPE=minor npm run build         # Build with minor bump
  node scripts/bump-version.js major           # Manual major bump

Build & Deploy:
  npm run deploy          Build (with auto-bump) and deploy to dev
  npm run deploy:all      Build (with auto-bump) and deploy to all environments
`);
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
    case 'current':
      showCurrentStatus();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showCurrentStatus();
      showHelp();
      break;
    
    case 'patch':
      console.log('🔧 Bumping patch version...');
      runCommand('node scripts/bump-version.js patch');
      break;
    
    case 'minor':
      console.log('🔧 Bumping minor version...');
      runCommand('node scripts/bump-version.js minor');
      break;
    
    case 'major':
      console.log('🔧 Bumping major version...');
      runCommand('node scripts/bump-version.js major');
      break;
    
    case 'build':
      console.log('🚀 Building with auto-version bump...');
      runCommand('npm run build');
      break;
    
    default:
      showCurrentStatus();
      console.log('Available commands: status, patch, minor, major, build, help');
      console.log('Run "node scripts/version-manager.js help" for detailed usage.');
  }
}

main();
