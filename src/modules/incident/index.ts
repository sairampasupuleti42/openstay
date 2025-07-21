// Incident Module - Centralized exports for all incident-related functionality

// Components
export { default as IncidentReportForm } from './components/IncidentReportForm';

// Pages
export { default as IncidentResponseDashboard } from './pages/IncidentResponseDashboard';
export { default as IncidentDetails } from './pages/IncidentDetails';
export { default as IncidentReportPage } from './pages/IncidentReportPage';

// Services
export { incidentService } from './services/incidentService';

// Types
export type * from './types/incident';

// Re-export common incident interfaces for convenience
export interface IncidentReportData {
  title: string;
  description: string;
  type: string;
  severity: string;
  priority: string;
  category: string;
  contactEmail: string;
  attachments: File[];
}

export interface IncidentReportFormProps {
  onClose?: () => void;
  onSubmit?: (data: IncidentReportData) => void;
}
