/**
 * Global type declarations for the Openstay application
 */

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

declare global {
  interface Window {
    BUILD_INFO: BuildInfo;
  }
  
  // Environment variables available during build
  namespace NodeJS {
    interface ProcessEnv {
      VITE_GIT_COMMIT?: string;
      VITE_GIT_BRANCH?: string;
      VITE_GIT_TAG?: string;
      VERCEL_GIT_COMMIT_SHA?: string;
      VERCEL_GIT_COMMIT_REF?: string;
      npm_package_version?: string;
    }
  }
}

export {};
