# Smart Auto-Versioning System

This system intelligently manages version bumping and build metadata injection based on actual code changes and deployment context. It ensures clean development workflows while providing comprehensive tracking for production deployments.

## ✨ Key Features

### 🧠 Smart Version Bumping
- **Code Change Detection**: Only bumps version when actual code changes are detected since last version
- **Git Integration**: Uses Git history to determine if version bump is needed
- **No Pollution**: Prevents unnecessary version bumps for unchanged code
- **Force Override**: Option to force version bump when needed

### 📝 Conditional Metadata Injection
- **Deployment Only**: Build metadata only injected during deployment builds
- **Clean Development**: Regular builds remain metadata-free
- **Comprehensive Info**: Full build, version, and Git information in deployments

## 🛠️ How It Works

### Version Bump Logic

1. **Check Git Status**: Analyzes Git repository for changes since last version tag
2. **Detect Real Changes**: Ignores version-only commits in package.json
3. **Smart Decision**: Only bumps version if meaningful code changes found
4. **Tag Creation**: Creates Git tag for new versions automatically

### Build Metadata Logic

1. **Environment Detection**: Checks `VITE_DEPLOYMENT` environment variable
2. **Conditional Injection**: Only injects metadata when `VITE_DEPLOYMENT=true`
3. **Clean Development**: Regular builds skip metadata entirely
4. **Rich Information**: Deployment builds include version, timestamp, Git info

## 📋 Usage

### Development Workflow (No Version Changes)

```bash
# Regular development builds
npm run build                    # ✅ No version bump, no metadata
npm run build:dev               # ✅ No version bump, no metadata  
npm run build:prod              # ✅ No version bump, no metadata

# Result: Clean builds for development and testing
```

### Deployment Workflow (Smart Version Management)

```bash
# Smart deployment to development
npm run deploy                  # 🧠 Smart version bump + metadata + deploy

# Smart deployment to production  
npm run deploy:all              # 🧠 Smart version bump + metadata + deploy

# Manual deployment (no version bump)
npm run deploy:manual           # ❌ No version bump, no metadata
npm run deploy:all:manual       # ❌ No version bump, no metadata
```

### Testing Smart Deployment

```bash
# Test deployment flow without Firebase
npm run deploy:test             # 🧪 Test smart version + metadata (no deploy)
npm run deploy:test:all         # 🧪 Test production flow (no deploy)
```

### Manual Version Control

```bash
# Manual version bumps (with smart detection)
npm run version:patch           # 🧠 Only bumps if code changes detected  
npm run version:minor           # 🧠 Only bumps if code changes detected
npm run version:major           # 🧠 Only bumps if code changes detected

# Force version bump (override smart detection)
node scripts/smart-version-bump.js patch --force
```

## 🎯 Smart Version Detection

### When Version IS Bumped

✅ **New Files Added**
```bash
git add src/new-feature.tsx
git commit -m "Add new feature"
npm run deploy  # Version: 0.0.50 → 0.0.51
```

✅ **Code Changes**
```bash
# Modified existing code
git commit -m "Fix user authentication bug"  
npm run deploy  # Version: 0.0.51 → 0.0.52
```

✅ **Configuration Changes**
```bash
# Modified vite.config.ts, tsconfig.json, etc.
git commit -m "Update build configuration"
npm run deploy  # Version: 0.0.52 → 0.0.53
```

### When Version IS NOT Bumped

❌ **No Changes Since Last Version**
```bash
npm run deploy  # Version: 0.0.53 (unchanged)
# Output: "✅ No code changes detected since last version."
```

❌ **Only Version Changes in package.json**
```bash
# Only package.json version field changed
npm run deploy  # Version: 0.0.53 (unchanged)
```

❌ **Non-Git Repository**
```bash
# Falls back to always bumping (safe default)
npm run deploy  # Version: 0.0.53 → 0.0.54
```

## 🏗️ Build Output Examples

### Development Build
```bash
$ npm run build
> tsc -b && vite build
📝 Skipping metadata injection (development build)
✓ built in 21.78s
# Clean HTML, no BUILD_INFO, no metadata
```

### Deployment Build  
```bash
$ npm run deploy
🔍 Checking for code changes...
🔧 Code changes detected, bumping patch version...
✅ Version bumped: 0.0.90 → 0.0.91
📦 Building deployment version 0.0.91...
📝 Injecting deployment metadata into HTML...
✓ built in 19.22s
🌐 Deploying to development...
✅ Deployment complete!
```

## 📊 Build Metadata (Deployment Only)

### HTML Meta Tags
```html
<!-- Only in deployment builds -->
<meta name="build:version" content="0.0.91" />
<meta name="build:time" content="2025-07-22T15:21:07.398Z" />
<meta name="build:timestamp" content="1753197667398" />
<meta name="build:env" content="production" />
<meta name="build:type" content="deployment" />
<meta name="build:deployment-type" content="dev" />
<meta name="build:git-commit" content="abc123" />
<meta name="build:git-branch" content="main" />
```

### JavaScript Build Info
```javascript
// Only available in deployment builds
window.BUILD_INFO = {
  version: "0.0.91",
  buildTime: "2025-07-22T15:21:07.398Z",
  timestamp: 1753197667398,
  environment: "production",
  buildType: "deployment",
  deploymentType: "dev",
  gitCommit: "abc123",
  gitBranch: "main"
};
```

### Console Output (Deployment Builds Only)
```javascript
🚀 Deployment Build Information
Version: 0.0.91
Build Time: 2025-07-22T15:21:07.398Z  
Environment: production
Deployment Type: dev
Git Commit: abc123
Git Branch: main
```

## 🔧 Configuration

### Environment Variables

| Variable | Purpose | Values | Default |
|----------|---------|--------|---------|
| `VITE_DEPLOYMENT` | Enable metadata injection | `"true"` | `undefined` |
| `VITE_DEPLOYMENT_TYPE` | Deployment target | `"dev"`, `"all"` | `"dev"` |
| `SKIP_VERSION_BUMP` | Skip version bumping | `"true"` | `undefined` |
| `VERSION_BUMP_TYPE` | Version bump type | `"patch"`, `"minor"`, `"major"` | `"patch"` |

### Custom Deployment Commands

```bash
# Deploy with minor version bump
VERSION_BUMP_TYPE=minor npm run deploy

# Deploy without version bump  
SKIP_VERSION_BUMP=true npm run deploy

# Deploy with major version bump
VERSION_BUMP_TYPE=major npm run deploy:all
```

## 🎪 Script Architecture

### File Structure
```
scripts/
├── smart-version-bump.js        # Smart version detection and bumping
├── smart-deploy.js             # Complete deployment with smart versioning
├── smart-deploy-test.js        # Test deployment flow
├── version-manager.js          # Interactive version management
└── setup-git-hooks.js         # Git integration setup
```

### Core Components

1. **Smart Version Bump** (`smart-version-bump.js`)
   - Git change detection
   - Semantic version bumping  
   - Tag creation

2. **Smart Deploy** (`smart-deploy.js`)
   - Version bump coordination
   - Build with metadata injection
   - Firebase deployment

3. **Build Metadata Plugin** (`buildMetadataPlugin.ts`)
   - Conditional metadata injection
   - Environment-aware building
   - Rich build information

## 📈 Benefits

### For Development
- ✅ **Clean Builds**: No unnecessary metadata or version changes
- ✅ **Fast Iteration**: No version pollution during development
- ✅ **Clear Separation**: Development vs deployment builds are distinct

### For Deployment  
- ✅ **Smart Versioning**: Only meaningful changes get version bumps
- ✅ **Rich Metadata**: Complete build information for debugging
- ✅ **Automatic Tracking**: Git tags and version history maintained

### For Maintenance
- ✅ **Clear History**: Version changes only reflect real code changes
- ✅ **Debug Support**: Build metadata available for issue tracking
- ✅ **Deployment Tracking**: Easy identification of deployed versions

## 🔍 Troubleshooting

### Version Not Bumping

**Check Git Repository**
```bash
git status                      # Ensure you're in a Git repo
git log --oneline -5           # Check recent commits
```

**Force Version Bump**
```bash
node scripts/smart-version-bump.js patch --force
```

### Metadata Not Appearing

**Check Environment Variables**
```bash
# Ensure VITE_DEPLOYMENT=true for metadata injection
VITE_DEPLOYMENT=true npm run build
```

**Verify Plugin Configuration**
```bash
# Check vite.config.ts includes buildMetadataPlugin
```

### Version Detection Issues

**Check Git Tags**
```bash
git tag -l "v*"                # List version tags
git describe --tags --abbrev=0 # Latest version tag
```

**Debug Version Detection**
```bash
node scripts/smart-version-bump.js patch --debug
```

This smart auto-versioning system ensures your Openstay application maintains clean development workflows while providing comprehensive version tracking and build metadata for production deployments.
