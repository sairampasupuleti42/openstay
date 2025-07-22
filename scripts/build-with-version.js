#!/usr/bin/env node

/**
 * Build with Version Bump
 * 
 * This script handles the complete build process with automatic version bumping
 * and proper environment variable passing.
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
  console.log('🚀 Building Openstay with automatic version bumping...\n');

  // Step 1: Bump version (unless skipped)
  if (process.env.SKIP_VERSION_BUMP !== 'true') {
    const bumpType = process.env.VERSION_BUMP_TYPE || 'patch';
    console.log(`🔧 Bumping ${bumpType} version...`);
    
    runCommand(`node scripts/bump-version.js ${bumpType}`);
  } else {
    console.log('⏭️  Skipping version bump (SKIP_VERSION_BUMP=true)');
  }

  // Step 2: Get the updated version
  const currentVersion = getCurrentVersion();
  const buildTime = new Date().toISOString();

  console.log(`📦 Building version ${currentVersion}...`);

  // Step 3: Run TypeScript compilation
  console.log('🔍 Type checking...');
  runCommand('tsc -b');

  // Step 4: Run Vite build with version info
  console.log('📦 Building assets...');
  runCommand('vite build', {
    VITE_APP_VERSION: currentVersion,
    VITE_BUILD_TIME: buildTime
  });

  console.log(`\n✅ Build complete! Version ${currentVersion}`);
  console.log(`📊 Build time: ${buildTime}`);
  
  // Show build info
  console.log('\n📈 Build Information:');
  console.log(`   Version: ${currentVersion}`);
  console.log(`   Build Time: ${new Date(buildTime).toLocaleString()}`);
  console.log(`   Environment: production`);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
});

main();
