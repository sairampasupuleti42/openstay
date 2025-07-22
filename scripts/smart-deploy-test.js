#!/usr/bin/env node

/**
 * Smart Deployment Test
 * 
 * This script tests the smart deployment flow without actually deploying to Firebase.
 * It demonstrates the smart version bumping (only when code changes) and conditional
 * metadata injection.
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
  
  console.log(`🧪 Testing smart deployment flow (${deploymentType})...\n`);

  const beforeVersion = getCurrentVersion();
  console.log(`📋 Current version: ${beforeVersion}`);

  // Step 1: Test smart version bump
  console.log(`🔍 Testing smart version bump (checks for code changes)...`);
  runCommand('node scripts/smart-version-bump.js patch');

  // Step 2: Get final version
  const finalVersion = getCurrentVersion();
  const buildTime = new Date().toISOString();
  
  if (finalVersion !== beforeVersion) {
    console.log(`📦 Version changed: ${beforeVersion} → ${finalVersion}`);
    console.log(`🔨 Building deployment version ${finalVersion}...`);
  } else {
    console.log(`📦 No version change (no code changes detected)`);
    console.log(`🔨 Building version ${finalVersion}...`);
  }

  // Step 3: Test build with deployment metadata injection
  console.log('🔨 Testing build with metadata injection...');
  runCommand('npm run build', {
    VITE_APP_VERSION: finalVersion,
    VITE_BUILD_TIME: buildTime,
    VITE_DEPLOYMENT: 'true',  // This enables metadata injection
    VITE_DEPLOYMENT_TYPE: deploymentType
  });

  console.log(`\n🚀 Smart deployment test complete!`);
  console.log(`📊 Final version: ${finalVersion}`);
  if (finalVersion !== beforeVersion) {
    console.log(`📈 Version progression: ${beforeVersion} → ${finalVersion}`);
    console.log(`✨ Version was bumped because code changes were detected`);
  } else {
    console.log(`⚡ Version unchanged - no code changes since last version`);
  }
  console.log(`🕒 Build time: ${new Date(buildTime).toLocaleString()}`);
  console.log(`🌐 Target: ${deploymentType === 'all' ? 'Production & Development' : 'Development'}`);
  console.log(`📝 Metadata injection: Enabled (deployment build)`);
  console.log(`📝 Firebase command that would run: firebase deploy${deploymentType === 'dev' ? ' --only hosting:dev' : ''}`);
  
  console.log(`\n✅ Ready for smart deployment!`);
  console.log(`💡 Use 'npm run deploy' for actual deployment`);
}

main();
