#!/usr/bin/env node

/**
 * Test Deployment Flow
 * 
 * This script simulates the deployment process without actually deploying to Firebase.
 * Useful for testing the version bump and build process.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function getCurrentVersion() {
  try {
    const content = readFileSync(join(rootDir, 'package.json'), 'utf8');
    const packageData = JSON.parse(content);
    return packageData.version;
  } catch (error) {
    console.error('❌ Failed to read current version:', error.message);
    return '0.0.0';
  }
}

function runCommand(command, env = {}) {
  try {
    return execSync(command, { 
      cwd: rootDir, 
      encoding: 'utf8',
      stdio: 'inherit',
      env: { ...process.env, ...env }
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

function main() {
  const deploymentType = process.argv[2] || 'dev';
  
  console.log(`🧪 Testing deployment flow (${deploymentType}) - No actual Firebase deployment\n`);

  // Step 1: Show current version
  const beforeVersion = getCurrentVersion();
  console.log(`📋 Current version: ${beforeVersion}`);

  // Step 2: Bump version
  if (process.env.SKIP_VERSION_BUMP !== 'true') {
    const bumpType = process.env.VERSION_BUMP_TYPE || 'patch';
    console.log(`🔧 Bumping ${bumpType} version for deployment...`);
    
    runCommand(`node scripts/bump-version.js ${bumpType}`);
  }

  // Step 3: Show new version
  const afterVersion = getCurrentVersion();
  const buildTime = new Date().toISOString();

  console.log(`📦 Building version ${afterVersion} for deployment...`);

  // Step 4: Build with deployment metadata
  runCommand('npm run build', {
    VITE_APP_VERSION: afterVersion,
    VITE_BUILD_TIME: buildTime,
    VITE_DEPLOYMENT: 'true'
  });

  // Step 5: Show what would be deployed
  console.log(`\n🚀 Deployment simulation complete!`);
  console.log(`📊 Version progression: ${beforeVersion} → ${afterVersion}`);
  console.log(`🕒 Build time: ${new Date(buildTime).toLocaleString()}`);
  console.log(`🌐 Target: ${deploymentType === 'all' ? 'Production & Development' : 'Development'}`);
  console.log(`📝 Firebase command that would run: firebase deploy${deploymentType === 'dev' ? ' --only hosting:dev' : ''}`);
  
  console.log(`\n✅ Ready for deployment with version ${afterVersion}!`);
}

main();
