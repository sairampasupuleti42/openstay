# Build Metadata System

This system automatically injects build information into production builds, providing visibility into deployment details and enabling better debugging and support.

## Features

### 🏗️ Build Information Injection
- **Version**: Extracted from package.json
- **Build Time**: ISO timestamp of when the build was created
- **Git Information**: Commit hash, branch, and tag (when available)
- **Environment**: Production/development indicator
- **Custom Metadata**: Configurable deployment-specific information

### 📊 Access Methods
- **HTML Meta Tags**: Build info available in `<head>` section
- **JavaScript Object**: `window.BUILD_INFO` for programmatic access
- **React Hook**: `useBuildInfo()` for React components
- **Console Logging**: Automatic build info display in browser console

## Implementation

### Plugin Configuration
The build metadata is injected using a custom Vite plugin in `vite.config.ts`:

```typescript
buildMetadataPlugin({
  customMetadata: {
    deployment: 'production',
    app: 'openstay'
  }
})
```

### React Integration
Use the `useBuildInfo` hook in your components:

```tsx
import { useBuildInfo } from '@/hooks/useBuildInfo';

function MyComponent() {
  const { buildInfo, isProduction, buildAge, shortCommit } = useBuildInfo();
  
  return (
    <div>
      <p>Version: {buildInfo?.version}</p>
      <p>Build Age: {buildAge} minutes</p>
      <p>Commit: {shortCommit}</p>
    </div>
  );
}
```

### Pre-built Components
- `<BuildInfoDisplay />`: Comprehensive build info display
- `<FooterBuildInfo />`: Minimal version info for footers

## Environment Variables

The plugin supports these environment variables for enhanced Git integration:

```bash
# Direct environment variables
VITE_GIT_COMMIT=abc123
VITE_GIT_BRANCH=main
VITE_GIT_TAG=v1.0.0

# Vercel deployment variables (auto-detected)
VERCEL_GIT_COMMIT_SHA=abc123
VERCEL_GIT_COMMIT_REF=main
```

## Generated Output

### HTML Meta Tags
```html
<meta name="build:version" content="0.0.1" />
<meta name="build:time" content="2025-01-22T10:05:54.911Z" />
<meta name="build:timestamp" content="1753178754911" />
<meta name="build:env" content="production" />
<meta name="build:git-commit" content="abc123" />
<meta name="build:git-branch" content="main" />
<meta name="build:deployment" content="production" />
<meta name="build:app" content="openstay" />
```

### JavaScript Object
```javascript
window.BUILD_INFO = {
  version: "0.0.1",
  buildTime: "2025-01-22T10:05:54.911Z",
  timestamp: 1753178754911,
  environment: "production",
  gitCommit: "abc123",
  gitBranch: "main",
  deployment: "production",
  app: "openstay"
};
```

## Usage Examples

### About Page
```tsx
import { BuildInfoDisplay } from '@/components/BuildInfoDisplay';

export function AboutPage() {
  return (
    <div>
      <h1>About Openstay</h1>
      <BuildInfoDisplay showInProduction={true} />
    </div>
  );
}
```

### Footer
```tsx
import { FooterBuildInfo } from '@/components/BuildInfoDisplay';

export function Footer() {
  return (
    <footer>
      <FooterBuildInfo className="text-center mt-4" />
    </footer>
  );
}
```

### Debug Panel
```tsx
import { useBuildInfo, useBuildFreshness } from '@/hooks/useBuildInfo';

export function DebugPanel() {
  const { buildInfo } = useBuildInfo();
  const { isStale, buildAge } = useBuildFreshness(60); // 60 minutes
  
  return (
    <div>
      {isStale && (
        <div className="warning">
          Build is {buildAge} minutes old - consider refreshing
        </div>
      )}
      <pre>{JSON.stringify(buildInfo, null, 2)}</pre>
    </div>
  );
}
```

## Benefits

### 🐛 Debugging
- Quickly identify which version users are running
- Correlate issues with specific builds and commits
- Track build age for cache-related problems

### 🚀 Deployment Tracking
- Verify successful deployments
- Monitor rollout progress
- Identify deployment environments

### 📈 Support & Analytics
- Include build info in error reports
- Track version adoption
- Identify outdated client builds

## File Structure

```
src/
├── plugins/
│   └── buildMetadataPlugin.ts    # Vite plugin for metadata injection
├── hooks/
│   └── useBuildInfo.ts           # React hook for accessing build info
├── components/
│   └── BuildInfoDisplay.tsx      # UI components for displaying build info
├── types/
│   └── global.d.ts               # TypeScript declarations
└── ...
```

## Build Process Integration

The system integrates seamlessly with your existing build process:

1. **Development**: No build info available, graceful fallbacks
2. **Production Build**: Automatic metadata injection via Vite plugin
3. **Runtime**: Build info available immediately after page load
4. **Console**: Automatic logging of build information

This system provides comprehensive visibility into your deployments while maintaining clean separation between development and production environments.
