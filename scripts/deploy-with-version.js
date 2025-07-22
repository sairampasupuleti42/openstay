#!/usr/bin/env node

/**
 * Deployment with Version Bump
 * 
 * This script handles deployment-specific version bumping and Firebase deployment.
 * Version bumping only occurs during actual deployments, not regular builds.
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
  
  console.log(`🚀 Deploying Openstay (${deploymentType}) with version bump...\n`);

  // Step 1: Bump version (unless skipped)
  if (process.env.SKIP_VERSION_BUMP !== 'true') {
    const bumpType = process.env.VERSION_BUMP_TYPE || 'patch';
    console.log(`🔧 Bumping ${bumpType} version for deployment...`);
    
    runCommand(`node scripts/bump-version.js ${bumpType}`);
  } else {
    console.log('⏭️  Skipping version bump (SKIP_VERSION_BUMP=true)');
  }

  // Step 2: Get the updated version
  const currentVersion = getCurrentVersion();
  const buildTime = new Date().toISOString();

  console.log(`📦 Building version ${currentVersion} for deployment...`);

  // Step 3: Build with version info
  runCommand('npm run build', {
    VITE_APP_VERSION: currentVersion,
    VITE_BUILD_TIME: buildTime,
    VITE_DEPLOYMENT: 'true'
  });

  // Step 4: Deploy based on type
  console.log(`🌐 Deploying to ${deploymentType === 'all' ? 'all environments' : 'development'}...`);
  
  if (deploymentType === 'all') {
    runCommand('firebase deploy');
  } else {
    runCommand('firebase deploy --only hosting:dev');
  }

  console.log(`\n✅ Deployment complete!`);
  console.log(`📊 Deployed version: ${currentVersion}`);
  console.log(`🕒 Deploy time: ${new Date(buildTime).toLocaleString()}`);
  console.log(`🌐 Environment: ${deploymentType === 'all' ? 'Production & Development' : 'Development'}`);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});

main();
