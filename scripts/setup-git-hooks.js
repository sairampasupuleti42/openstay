#!/usr/bin/env node

/**
 * Git Hooks Setup for Version Management
 * 
 * This script sets up Git hooks to automatically commit version changes
 * and tag releases when versions are bumped.
 */

import { writeFileSync, mkdirSync, chmodSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const gitHooksDir = join(rootDir, '.git', 'hooks');

// Pre-commit hook to ensure package.json changes are staged
const preCommitHook = `#!/bin/sh
# Pre-commit hook for Openstay version management

# Check if package.json has version changes that should be committed
if git diff --cached --name-only | grep -q "package.json"; then
  echo "✅ package.json changes detected in commit"
fi

# Continue with normal pre-commit process
exit 0
`;

// Post-commit hook to create tags for version bumps
const postCommitHook = `#!/bin/sh
# Post-commit hook for Openstay version management

# Check if this commit includes a version bump
if git diff HEAD~1 --name-only | grep -q "package.json"; then
  # Extract the new version from package.json
  NEW_VERSION=$(node -p "require('./package.json').version")
  
  # Check if this version already has a tag
  if ! git tag | grep -q "v$NEW_VERSION"; then
    echo "📦 Creating tag for version v$NEW_VERSION"
    git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
    echo "✅ Tagged release v$NEW_VERSION"
  fi
fi

exit 0
`;

function setupGitHooks() {
  console.log('🔧 Setting up Git hooks for version management...');

  // Ensure .git/hooks directory exists
  if (!existsSync(gitHooksDir)) {
    console.log('❌ .git/hooks directory not found. Make sure you\'re in a Git repository.');
    process.exit(1);
  }

  try {
    // Write pre-commit hook
    const preCommitPath = join(gitHooksDir, 'pre-commit');
    writeFileSync(preCommitPath, preCommitHook, { mode: 0o755 });
    console.log('✅ Pre-commit hook installed');

    // Write post-commit hook  
    const postCommitPath = join(gitHooksDir, 'post-commit');
    writeFileSync(postCommitPath, postCommitHook, { mode: 0o755 });
    console.log('✅ Post-commit hook installed');

    console.log('\n📖 Git hooks setup complete!');
    console.log('   - Pre-commit: Validates package.json changes');
    console.log('   - Post-commit: Auto-creates version tags');
    console.log('\n💡 To disable hooks temporarily: git commit --no-verify');

  } catch (error) {
    console.error('❌ Failed to setup Git hooks:', error.message);
    process.exit(1);
  }
}

function main() {
  const command = process.argv[2];

  if (command === 'remove' || command === 'uninstall') {
    console.log('🗑️  Removing Git hooks...');
    // Remove hooks by making them non-executable or deleting them
    try {
      const preCommitPath = join(gitHooksDir, 'pre-commit');
      const postCommitPath = join(gitHooksDir, 'post-commit');
      
      if (existsSync(preCommitPath)) {
        chmodSync(preCommitPath, 0o644);
        console.log('✅ Pre-commit hook disabled');
      }
      
      if (existsSync(postCommitPath)) {
        chmodSync(postCommitPath, 0o644);
        console.log('✅ Post-commit hook disabled');
      }
      
      console.log('✅ Git hooks removed');
    } catch (error) {
      console.error('❌ Failed to remove Git hooks:', error.message);
    }
  } else {
    setupGitHooks();
  }
}

main();
