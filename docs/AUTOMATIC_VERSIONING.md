# Deployment-Triggered Version Management System

This system automatically increments the version number in `package.json` **only during deployments**, providing proper versioning for production releases while keeping development builds clean.

## ✨ Features

### � Deployment-Only Version Bumping
- **Only on Deploy**: Version increments only when running `npm run deploy` or `npm run deploy:all`
- **Clean Development**: Regular builds (`npm run build`) do not change version numbers
- **Build Metadata**: Deployment builds are tagged with `buildType: "deployment"`
- **Skip Option**: Can be disabled when needed

### 📊 Version Types
- **Patch** (default): Bug fixes and small changes (0.0.81 → 0.0.82)
- **Minor**: New features (0.0.81 → 0.1.0)  
- **Major**: Breaking changes (0.0.81 → 1.0.0)

## 🛠️ Usage

### Development Builds (No Version Change)
```bash
npm run build                    # Build without version change
npm run build:dev               # Same as build
npm run build:prod              # Same as build
npm run build:manual            # Same as build
```

### Deployment Builds (Auto-increment Version)
```bash
npm run deploy                  # Bump patch → build → deploy to dev
npm run deploy:all              # Bump patch → build → deploy to all environments
```

### Manual Deployment (No Version Change)
```bash
npm run deploy:manual           # Build → deploy to dev (no version bump)
npm run deploy:all:manual       # Build → deploy to all (no version bump)
```

### Test Deployment Flow
```bash
npm run deploy:test             # Test deployment flow without Firebase deploy
npm run deploy:test:all         # Test production deployment flow
```

### Manual Version Control
```bash
npm run version:patch           # Bump patch version only
npm run version:minor           # Bump minor version only  
npm run version:major           # Bump major version only
npm run version:status          # Show current version info
```

### Deployment with Specific Version Type
```bash
VERSION_BUMP_TYPE=minor npm run deploy     # Deploy with minor bump
VERSION_BUMP_TYPE=major npm run deploy:all # Deploy with major bump
```

### Skip Version Bumping During Deployment
```bash
SKIP_VERSION_BUMP=true npm run deploy      # Deploy without version change
```

## 🏗️ Implementation

### File Structure
```
scripts/
├── bump-version.js              # Core version bumping logic
├── deploy-with-version.js       # Complete deployment process with versioning
├── test-deploy.js              # Test deployment flow without Firebase
├── version-manager.js           # Interactive version management
└── setup-git-hooks.js          # Git integration setup
```

### Deployment Process Flow

1. **Version Bump**: Increment version in `package.json` (deployment only)
2. **Environment Setup**: Set `VITE_APP_VERSION`, `VITE_BUILD_TIME`, and `VITE_DEPLOYMENT=true`
3. **Type Check**: Run TypeScript compilation
4. **Asset Build**: Run Vite build with deployment metadata
5. **Metadata Injection**: Add version info to HTML and JavaScript with deployment flag
6. **Firebase Deploy**: Deploy to specified environment

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "deploy": "node scripts/deploy-with-version.js dev",
    "deploy:all": "node scripts/deploy-with-version.js all",
    "deploy:test": "node scripts/test-deploy.js dev",
    "version:patch": "node scripts/bump-version.js patch",
    "version:minor": "node scripts/bump-version.js minor",
    "version:major": "node scripts/bump-version.js major"
  }
}
```

## 🎯 Build Output

### Version Metadata in HTML
```html
<meta name="build:version" content="0.0.87" />
<meta name="build:time" content="2025-01-22T10:26:10.435Z" />
<meta name="build:timestamp" content="1753179970435" />
<meta name="build:env" content="production" />
<meta name="build:type" content="deployment" />
```

### JavaScript Build Info
```javascript
window.BUILD_INFO = {
  version: "0.0.87",
  buildTime: "2025-01-22T10:26:10.435Z",
  timestamp: 1753179970435,
  environment: "production",
  buildType: "deployment",  // "deployment" or "development"
  // ... additional metadata
};
```

### Console Output (Deployment)
```
🚀 Deploying Openstay (dev) with version bump...
🔧 Bumping patch version for deployment...
✅ Version bumped: 0.0.86 → 0.0.87
📦 Building version 0.0.87 for deployment...
🌐 Deploying to development...
✅ Deployment complete!
📊 Deployed version: 0.0.87
```

### Console Output (Regular Build)
```
> npm run build
> tsc -b && vite build
✓ built in 18.82s
# No version bump messages
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SKIP_VERSION_BUMP` | Skip automatic version bumping | `false` | `true` |
| `VERSION_BUMP_TYPE` | Type of version bump | `patch` | `minor`, `major` |
| `VITE_APP_VERSION` | Version for build metadata | From package.json | `0.0.84` |
| `VITE_BUILD_TIME` | Build timestamp | Current time | `2025-01-22T10:14:16.700Z` |

### Git Integration (Optional)

Setup Git hooks to automatically commit version changes:

```bash
npm run version:setup              # Install Git hooks
node scripts/setup-git-hooks.js    # Direct installation
```

This creates:
- **Pre-commit hook**: Validates package.json changes
- **Post-commit hook**: Creates version tags automatically

## 📈 Benefits

### 🐛 Development
- **Unique Builds**: Every build has a unique version number
- **Build Tracking**: Easy to identify which build is deployed
- **Debugging**: Quick version identification in production
- **Cache Busting**: Version changes help with browser caching

### 🚀 Deployment
- **Automated Versioning**: No manual version management needed  
- **Consistent Releases**: Every deployment gets proper version tracking
- **Rollback Support**: Easy to identify and revert to specific versions
- **Build Metadata**: Rich build information available at runtime

### 👥 Team Collaboration
- **Version History**: Clear progression of version numbers
- **Build Identification**: Support teams can quickly identify versions
- **Deployment Tracking**: Easy to correlate deployments with versions
- **CI/CD Integration**: Works seamlessly with automated deployments

## 📝 Best Practices

### Development Workflow
```bash
# Regular development builds (no version change)
npm run build                      # Clean build for testing

# Feature development
git commit -m "Add new feature"    # No version change
npm run build                      # Test build

# Ready to deploy feature
npm run deploy                     # Auto-increment + deploy to dev

# Production release
npm run deploy:all                 # Auto-increment + deploy to production
```

### Release Workflow  
```bash
# Bug fix release
npm run deploy                     # Patch increment + deploy

# Feature release
VERSION_BUMP_TYPE=minor npm run deploy:all  # Minor increment + deploy

# Breaking change release  
VERSION_BUMP_TYPE=major npm run deploy:all  # Major increment + deploy
```

### Testing Deployment
```bash
# Test deployment flow without Firebase
npm run deploy:test                # Simulates deployment process
npm run deploy:test:all           # Simulates production deployment
```

## 🔍 Troubleshooting

### Common Issues

**Build fails after version bump**
- Check TypeScript compilation errors
- Ensure all dependencies are installed

**Version not updating in build**
- Verify `VITE_APP_VERSION` environment variable
- Check build metadata plugin configuration

**Git hooks not working**
- Run `npm run version:setup` to reinstall hooks
- Check `.git/hooks/` directory permissions

### Debug Commands
```bash
node scripts/version-manager.js status    # Show version info
node scripts/bump-version.js patch --dry-run  # Test version bump
SKIP_VERSION_BUMP=true npm run build     # Build without version change
```

This automatic versioning system ensures every build of Openstay has proper version tracking, making development, deployment, and maintenance much more manageable.
