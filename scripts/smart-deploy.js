#!/usr/bin/env node

/**
 * Smart Deployment Manager for Openstay
 * 
 * This script handles deployment with smart version bumping (only when code changes)
 * and conditional build metadata injection (only during deployment).
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
  const deploymentType = process.argv[2] || 'dev'; // 'dev' or 'all'
  const skipVersionBump = process.env.SKIP_VERSION_BUMP === 'true';
  
  console.log(`🚀 Starting smart deployment (${deploymentType})...\n`);

  const beforeVersion = getCurrentVersion();
  console.log(`📋 Current version: ${beforeVersion}`);

  // Step 1: Smart version bump (only if code changes detected)
  if (!skipVersionBump) {
    const bumpType = process.env.VERSION_BUMP_TYPE || 'patch';
    console.log(`🔍 Checking for code changes before version bump...`);
    
    runCommand(`node scripts/smart-version-bump.js ${bumpType}`);
  } else {
    console.log('⏭️  Skipping version bump (SKIP_VERSION_BUMP=true)');
  }

  // Step 2: Get final version (may be unchanged if no code changes)
  const finalVersion = getCurrentVersion();
  const buildTime = new Date().toISOString();
  
  if (finalVersion !== beforeVersion) {
    console.log(`📦 Building version ${finalVersion} for deployment...`);
  } else {
    console.log(`📦 Building version ${finalVersion} (no version change - no code changes detected)`);
  }

  // Step 3: Build with deployment metadata injection enabled
  console.log('🔨 Building with deployment metadata injection...');
  runCommand('npm run build', {
    VITE_APP_VERSION: finalVersion,
    VITE_BUILD_TIME: buildTime,
    VITE_DEPLOYMENT: 'true',  // This enables metadata injection
    VITE_DEPLOYMENT_TYPE: deploymentType
  });

  // Step 4: Deploy to Firebase
  console.log(`🌐 Deploying to ${deploymentType === 'all' ? 'all environments' : 'development'}...`);
  
  if (deploymentType === 'all') {
    runCommand('firebase deploy');
  } else {
    runCommand('firebase deploy --only hosting:dev');
  }

  console.log(`\n✅ Deployment complete!`);
  console.log(`📊 Deployed version: ${finalVersion}`);
  if (finalVersion !== beforeVersion) {
    console.log(`📈 Version changed: ${beforeVersion} → ${finalVersion}`);
  }
  console.log(`🕒 Deploy time: ${new Date(buildTime).toLocaleString()}`);
  console.log(`🌐 Environment: ${deploymentType === 'all' ? 'Production & Development' : 'Development'}`);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});

main();
