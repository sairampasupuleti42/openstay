/**
 * Build Information Component
 * 
 * Displays build metadata in the UI. Useful for debugging, about pages,
 * or admin dashboards.
 */

import { useBuildInfo } from '../hooks/useBuildInfo';

interface BuildInfoDisplayProps {
  showInProduction?: boolean;
  compact?: boolean;
  className?: string;
}

export function BuildInfoDisplay({ 
  showInProduction = false, 
  compact = false,
  className = ''
}: BuildInfoDisplayProps) {
  const { buildInfo, isProduction, formattedBuildTime, shortCommit, buildAge } = useBuildInfo();

  // Don't show in production unless explicitly requested
  if (isProduction && !showInProduction) {
    return null;
  }

  // Don't show if no build info available
  if (!buildInfo) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        <span>Development mode - No build info available</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`text-xs text-gray-500 space-y-1 ${className}`}>
        <div>v{buildInfo.version} ({shortCommit})</div>
        <div>Built {buildAge} minutes ago</div>
      </div>
    );
  }

  return (
    <div className={`text-xs text-gray-500 space-y-1 ${className}`}>
      <div className="font-medium">Build Information</div>
      <div>Version: {buildInfo.version}</div>
      <div>Built: {formattedBuildTime}</div>
      <div>Age: {buildAge} minutes ago</div>
      <div>Environment: {buildInfo.environment}</div>
      <div>Commit: {shortCommit}</div>
      <div>Branch: {buildInfo.gitBranch}</div>
      {buildInfo.deployment && <div>Deployment: {buildInfo.deployment}</div>}
    </div>
  );
}

/**
 * Footer Build Info - Shows minimal build info in footer
 */
export function FooterBuildInfo({ className = '' }: { className?: string }) {
  const { buildInfo, shortCommit } = useBuildInfo();

  if (!buildInfo) return null;

  return (
    <div className={`text-xs text-gray-400 ${className}`}>
      v{buildInfo.version} ({shortCommit})
    </div>
  );
}
