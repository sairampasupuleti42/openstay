export interface Incident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priority: IncidentPriority;
  reporter: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'moderator';
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  affectedUsers?: string[];
  tags: string[];
  category: IncidentCategory;
  source: IncidentSource;
  escalationLevel: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  estimatedResolutionTime?: Date;
  actualResolutionTime?: number; // in minutes
  timeline: IncidentTimelineEntry[];
  attachments: IncidentAttachment[];
  relatedIncidents: string[];
  impact: {
    scope: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    estimatedAffectedUsers: number;
  };
  resolution?: {
    description: string;
    actionsTaken: string[];
    preventiveMeasures: string[];
    rootCause?: string;
  };
}

export type IncidentType = 
  | 'security'
  | 'technical'
  | 'service_outage'
  | 'data_breach'
  | 'user_report'
  | 'abuse'
  | 'fraud'
  | 'payment'
  | 'legal'
  | 'compliance'
  | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 
  | 'open'
  | 'in_progress'
  | 'investigating'
  | 'waiting_for_response'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'on_hold';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

export type IncidentCategory = 
  | 'platform_security'
  | 'user_safety'
  | 'data_protection'
  | 'service_availability'
  | 'payment_processing'
  | 'content_moderation'
  | 'legal_compliance'
  | 'technical_issue'
  | 'user_experience'
  | 'external_threat';

export type IncidentSource = 
  | 'user_report'
  | 'automated_detection'
  | 'admin_observation'
  | 'external_notification'
  | 'monitoring_alert'
  | 'third_party_report';

export interface IncidentTimelineEntry {
  id: string;
  timestamp: Date;
  action: string;
  description: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  type: 'status_change' | 'comment' | 'escalation' | 'assignment' | 'resolution' | 'investigation';
  metadata?: Record<string, unknown>;
}

export interface IncidentAttachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface IncidentEscalationRule {
  id: string;
  condition: {
    severity?: IncidentSeverity[];
    type?: IncidentType[];
    timeThreshold?: number; // minutes
    category?: IncidentCategory[];
  };
  action: {
    notifyUsers: string[];
    escalateToLevel: number;
    autoAssign?: string;
    priorityIncrease?: boolean;
  };
  isActive: boolean;
}

export interface IncidentMetrics {
  totalIncidents: number;
  openIncidents: number;
  averageResolutionTime: number;
  incidentsByType: Record<IncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  escalationRate: number;
  slaBreaches: number;
  trendsLastWeek: {
    total: number;
    resolved: number;
    avgResolutionTime: number;
  };
}

export interface IncidentSLATarget {
  severity: IncidentSeverity;
  responseTime: number; // minutes
  resolutionTime: number; // minutes
}

export const INCIDENT_SLA_TARGETS: IncidentSLATarget[] = [
  { severity: 'critical', responseTime: 15, resolutionTime: 120 },
  { severity: 'high', responseTime: 60, resolutionTime: 480 },
  { severity: 'medium', responseTime: 240, resolutionTime: 1440 },
  { severity: 'low', responseTime: 1440, resolutionTime: 4320 }
];

export interface IncidentFilter {
  status?: IncidentStatus[];
  severity?: IncidentSeverity[];
  type?: IncidentType[];
  priority?: IncidentPriority[];
  assignee?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  category?: IncidentCategory[];
}
