import type { Plugin } from 'vite';

interface BuildMetadataOptions {
  injectBuildInfo?: boolean;
  injectGitInfo?: boolean;
  customMetadata?: Record<string, string>;
}

export function buildMetadataPlugin(options: BuildMetadataOptions = {}): Plugin {
  const {
    injectBuildInfo = true,
    injectGitInfo = true,
    customMetadata = {}
  } = options;

  return {
    name: 'build-metadata',
    apply: 'build', // Only apply during build
    transformIndexHtml(html: string) {
      const buildTime = new Date().toISOString();
      const buildTimestamp = Date.now();
      
      // Get version from environment (set by bump script) or package.json
      const version = process.env.VITE_APP_VERSION || 
                     process.env.npm_package_version || 
                     '0.0.0';
      
      let metadata = '';

      if (injectBuildInfo) {
        metadata += `
    <!-- Build Information -->
    <meta name="build:version" content="${version}" />
    <meta name="build:time" content="${buildTime}" />
    <meta name="build:timestamp" content="${buildTimestamp}" />
    <meta name="build:env" content="production" />`;
      }

      if (injectGitInfo) {
        try {
          // Try to get git information
          const gitCommit = process.env.VITE_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
          const gitBranch = process.env.VITE_GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';
          const gitTag = process.env.VITE_GIT_TAG || process.env.VERCEL_GIT_COMMIT_REF || '';
          
          metadata += `
    <meta name="build:git-commit" content="${gitCommit}" />
    <meta name="build:git-branch" content="${gitBranch}" />`;
  
          if (gitTag) {
            metadata += `
    <meta name="build:git-tag" content="${gitTag}" />`;
          }
        } catch (error) {
          console.warn('Could not retrieve git information:', error);
        }
      }

      // Add custom metadata
      Object.entries(customMetadata).forEach(([key, value]) => {
        metadata += `
    <meta name="build:${key}" content="${value}" />`;
      });

      // Add build script that exposes build info to window object
      const buildScript = `
    <script>
      window.BUILD_INFO = {
        version: "${version}",
        buildTime: "${buildTime}",
        timestamp: ${buildTimestamp},
        environment: "production",
        gitCommit: "${process.env.VITE_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'}",
        gitBranch: "${process.env.VITE_GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main'}",
        ...${JSON.stringify(customMetadata)}
      };
      
      // Add build info to console
      console.group('🚀 Build Information');
      console.log('Version:', window.BUILD_INFO.version);
      console.log('Build Time:', window.BUILD_INFO.buildTime);
      console.log('Environment:', window.BUILD_INFO.environment);
      console.log('Git Commit:', window.BUILD_INFO.gitCommit);
      console.log('Git Branch:', window.BUILD_INFO.gitBranch);
      console.groupEnd();
    </script>`;

      // Insert metadata before the closing </head> tag
      const headCloseIndex = html.indexOf('</head>');
      if (headCloseIndex !== -1) {
        html = html.slice(0, headCloseIndex) + metadata + buildScript + '\n  ' + html.slice(headCloseIndex);
      }

      return html;
    }
  };
}
