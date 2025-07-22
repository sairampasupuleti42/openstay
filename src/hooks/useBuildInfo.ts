/**
 * React hook for accessing build information
 * 
 * This hook provides access to build metadata that's injected into the HTML
 * during the production build process. It includes version, build time, 
 * git information, and custom metadata.
 * 
 * @example
 * ```tsx
 * function AboutPage() {
 *   const buildInfo = useBuildInfo();
 *   
 *   return (
 *     <div>
 *       <p>Version: {buildInfo.version}</p>
 *       <p>Built on: {new Date(buildInfo.buildTime).toLocaleDateString()}</p>
 *       <p>Commit: {buildInfo.gitCommit.substring(0, 7)}</p>
 *     </div>
 *   );
 * }
 * ```
 */

import { useMemo } from 'react';

// Define BuildInfo interface locally to avoid global declaration issues
interface BuildInfo {
  version: string;
  buildTime: string;
  timestamp: number;
  environment: string;
  gitCommit: string;
  gitBranch: string;
  deployment?: string;
  app?: string;
  [key: string]: string | number | boolean | undefined;
}

interface BuildInfoHook {
  buildInfo: BuildInfo | null;
  isProduction: boolean;
  buildAge: number; // Age in minutes
  formattedBuildTime: string;
  shortCommit: string;
}

export function useBuildInfo(): BuildInfoHook {
  return useMemo(() => {
    // Check if build info is available (only in production builds)
    const buildInfo = (typeof window !== 'undefined' && window.BUILD_INFO) || null;
    const isProduction = buildInfo?.environment === 'production';
    
    if (!buildInfo) {
      return {
        buildInfo: null,
        isProduction: false,
        buildAge: 0,
        formattedBuildTime: '',
        shortCommit: ''
      };
    }

    // Calculate build age in minutes
    const now = Date.now();
    const buildAge = Math.floor((now - buildInfo.timestamp) / (1000 * 60));

    // Format build time for display
    const formattedBuildTime = new Date(buildInfo.buildTime).toLocaleString();

    // Get short commit hash
    const shortCommit = buildInfo.gitCommit?.substring(0, 7) || 'unknown';

    return {
      buildInfo,
      isProduction,
      buildAge,
      formattedBuildTime,
      shortCommit
    };
  }, []);
}

/**
 * Hook for checking if the current build is stale
 * Useful for showing update notifications
 */
export function useBuildFreshness(staleAfterMinutes: number = 60) {
  const { buildAge, buildInfo } = useBuildInfo();
  
  return useMemo(() => ({
    isStale: buildInfo && buildAge > staleAfterMinutes,
    buildAge,
    staleAfterMinutes
  }), [buildAge, buildInfo, staleAfterMinutes]);
}

/**
 * Development helper for accessing build info in console
 * Only works in production builds
 */
export function logBuildInfo(): void {
  if (typeof window !== 'undefined' && window.BUILD_INFO) {
    console.group('🚀 Build Information');
    console.log('Version:', window.BUILD_INFO.version);
    console.log('Build Time:', window.BUILD_INFO.buildTime);
    console.log('Environment:', window.BUILD_INFO.environment);
    console.log('Git Commit:', window.BUILD_INFO.gitCommit);
    console.log('Git Branch:', window.BUILD_INFO.gitBranch);
    console.log('Build Age:', `${Math.floor((Date.now() - window.BUILD_INFO.timestamp) / (1000 * 60))} minutes`);
    console.groupEnd();
  } else {
    console.log('Build information not available (development mode)');
  }
}
