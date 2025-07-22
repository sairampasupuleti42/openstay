# Automatic Version Management System

This system automatically increments the version number in `package.json` for every build, providing proper versioning and build tracking for the Openstay application.

## ✨ Features

### 🔄 Automatic Version Bumping
- **Every Build**: Automatically increments patch version (0.0.81 → 0.0.82)
- **Build Integration**: Seamlessly integrated into the build process
- **Environment Variables**: Version info available throughout build pipeline
- **Skip Option**: Can be disabled when needed

### 📊 Version Types
- **Patch** (default): Bug fixes and small changes (0.0.81 → 0.0.82)
- **Minor**: New features (0.0.81 → 0.1.0)  
- **Major**: Breaking changes (0.0.81 → 1.0.0)

## 🛠️ Usage

### Standard Build (Auto-increment Patch)
```bash
npm run build                    # Bumps 0.0.81 → 0.0.82 and builds
npm run build:dev               # Same as build
npm run build:prod              # Same as build
```

### Manual Version Control
```bash
npm run version:patch           # Bump patch version only
npm run version:minor           # Bump minor version only  
npm run version:major           # Bump major version only
npm run version:status          # Show current version info
```

### Build with Specific Version Type
```bash
VERSION_BUMP_TYPE=minor npm run build     # Build with minor bump
VERSION_BUMP_TYPE=major npm run build     # Build with major bump
```

### Skip Version Bumping
```bash
SKIP_VERSION_BUMP=true npm run build      # Build without version change
npm run build:manual                      # Build without version change
```

## 🏗️ Implementation

### File Structure
```
scripts/
├── bump-version.js              # Core version bumping logic
├── build-with-version.js        # Complete build process with versioning
├── version-manager.js           # Interactive version management
└── setup-git-hooks.js          # Git integration setup
```

### Build Process Flow

1. **Version Bump**: Increment version in `package.json`
2. **Environment Setup**: Set `VITE_APP_VERSION` and `VITE_BUILD_TIME`
3. **Type Check**: Run TypeScript compilation
4. **Asset Build**: Run Vite build with version metadata
5. **Metadata Injection**: Add version info to HTML and JavaScript

### Package.json Scripts

```json
{
  "scripts": {
    "build": "node scripts/build-with-version.js",
    "build:manual": "tsc -b && vite build",
    "version:patch": "node scripts/bump-version.js patch",
    "version:minor": "node scripts/bump-version.js minor",
    "version:major": "node scripts/bump-version.js major",
    "version:status": "node scripts/version-manager.js status"
  }
}
```

## 🎯 Build Output

### Version Metadata in HTML
```html
<meta name="build:version" content="0.0.84" />
<meta name="build:time" content="2025-01-22T10:14:16.700Z" />
<meta name="build:timestamp" content="1753179256701" />
<meta name="build:env" content="production" />
```

### JavaScript Build Info
```javascript
window.BUILD_INFO = {
  version: "0.0.84",
  buildTime: "2025-01-22T10:14:16.700Z",
  timestamp: 1753179256701,
  environment: "production",
  // ... additional metadata
};
```

### Console Output
```
🚀 Building Openstay with automatic version bumping...
🔧 Bumping patch version...
✅ Version bumped: 0.0.83 → 0.0.84
📦 Building version 0.0.84...
🔍 Type checking...
📦 Building assets...
✅ Build complete! Version 0.0.84
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
# Regular development builds
npm run build                      # Auto-increment and build

# Feature releases  
VERSION_BUMP_TYPE=minor npm run build

# Bug fixes (default behavior)
npm run build                      # Patch increment

# Emergency fixes without version change
SKIP_VERSION_BUMP=true npm run build
```

### Deployment Pipeline
```bash
# Development deployment
npm run deploy                     # Builds with version bump + deploys

# Production deployment  
npm run deploy:all                 # Builds with version bump + deploys all
```

### Version Management
```bash
# Check current version
npm run version:status

# Manual version control
npm run version:minor              # For feature releases
npm run version:major              # For breaking changes
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
