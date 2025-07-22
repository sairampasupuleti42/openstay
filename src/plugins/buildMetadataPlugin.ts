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
    name: 'smart-build-metadata',
    apply: 'build',
    transformIndexHtml(html: string) {
      // Only inject metadata during deployment builds
      const isDeployment = process.env.VITE_DEPLOYMENT === 'true';
      
      if (!isDeployment) {
        console.log('📝 Skipping metadata injection (development build)');
        return html;
      }

      console.log('📝 Injecting deployment metadata into HTML...');
      
      const buildTime = new Date().toISOString();
      const buildTimestamp = Date.now();
      
      // Get version from environment or package.json
      const version = process.env.VITE_APP_VERSION || 
                     process.env.npm_package_version || 
                     '0.0.0';
      
      const deploymentType = process.env.VITE_DEPLOYMENT_TYPE || 'dev';
      
      let metadata = '';

      if (injectBuildInfo) {
        metadata += `
    <!-- Build Information (Deployment Only) -->
    <meta name="build:version" content="${version}" />
    <meta name="build:time" content="${buildTime}" />
    <meta name="build:timestamp" content="${buildTimestamp}" />
    <meta name="build:env" content="production" />
    <meta name="build:type" content="deployment" />
    <meta name="build:deployment-type" content="${deploymentType}" />`;
      }

      if (injectGitInfo) {
        try {
          const gitCommit = process.env.VITE_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
          const gitBranch = process.env.VITE_GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';
          const gitTag = process.env.VITE_GIT_TAG || '';
          
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

      // Add deployment build script
      const buildScript = `
    <script>
      // Build information (only available in deployment builds)
      window.BUILD_INFO = {
        version: "${version}",
        buildTime: "${buildTime}",
        timestamp: ${buildTimestamp},
        environment: "production",
        buildType: "deployment",
        deploymentType: "${deploymentType}",
        gitCommit: "${process.env.VITE_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'}",
        gitBranch: "${process.env.VITE_GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main'}",
        ...${JSON.stringify(customMetadata)}
      };
      
      // Console logging for deployment builds
      console.group('🚀 Deployment Build Information');
      console.log('Version:', window.BUILD_INFO.version);
      console.log('Build Time:', window.BUILD_INFO.buildTime);
      console.log('Environment:', window.BUILD_INFO.environment);
      console.log('Deployment Type:', window.BUILD_INFO.deploymentType);
      console.log('Git Commit:', window.BUILD_INFO.gitCommit);
      console.log('Git Branch:', window.BUILD_INFO.gitBranch);
      console.groupEnd();
    </script>`;

      // Insert metadata before closing head tag
      const headCloseIndex = html.indexOf('</head>');
      if (headCloseIndex !== -1) {
        html = html.slice(0, headCloseIndex) + metadata + buildScript + '\n  ' + html.slice(headCloseIndex);
      }

      return html;
    }
  };
}
