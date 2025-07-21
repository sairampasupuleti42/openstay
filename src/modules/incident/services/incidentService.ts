import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Simplified types for the service
interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  timestamp: Date;
  actor: User;
  description: string;
}

interface Incident {
  id?: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  priority: string;
  reporter: User;
  assignee?: User;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  tags: string[];
  category: string;
  escalationLevel: number;
  timeline: TimelineEvent[];
  impact: {
    scope: string;
    description: string;
    estimatedAffectedUsers: number;
  };
}

interface IncidentFilter {
  status?: string[];
  severity?: string[];
  type?: string[];
  assigneeId?: string;
  reporterId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

interface IncidentMetrics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  averageResolutionTime: number;
  slaCompliance: number;
  escalationRate: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  incidentsByStatus: Record<string, number>;
  timeRange: { start: Date; end: Date };
}

export class IncidentService {
  private collectionName = 'incidents';

  // Create a new incident
  async createIncident(incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const incident = {
        ...incidentData,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline: [{
          id: crypto.randomUUID(),
          type: 'created',
          timestamp: new Date(),
          actor: incidentData.reporter,
          description: `Incident reported: ${incidentData.title}`
        }]
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...incident,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        timeline: incident.timeline.map(event => ({
          ...event,
          timestamp: Timestamp.fromDate(event.timestamp)
        }))
      });

      // Auto-assign based on routing rules
      await this.autoAssignIncident(docRef.id, incident.type, incident.severity);
      
      // Check for immediate escalation
      await this.checkEscalationRules(docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error creating incident:', error);
      throw error;
    }
  }

  // Get incident by ID
  async getIncident(id: string): Promise<Incident | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
          timeline: data.timeline?.map((event: unknown) => {
            const typedEvent = event as Record<string, unknown>;
            return {
              ...typedEvent,
              timestamp: (typedEvent.timestamp as { toDate: () => Date })?.toDate() || new Date()
            };
          }) || []
        } as Incident;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting incident:', error);
      throw error;
    }
  }

  // Update incident
  async updateIncident(id: string, updates: Partial<Incident>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Handle status change
      if (updates.status) {
        const timelineEvent: TimelineEvent = {
          id: crypto.randomUUID(),
          type: 'status_change',
          timestamp: new Date(),
          actor: updates.assignee || { id: 'system', name: 'System', email: 'system@openstay.com' },
          description: `Status changed to ${updates.status.replace('_', ' ')}`
        };

        // Get current incident to append to timeline
        const currentIncident = await this.getIncident(id);
        if (currentIncident) {
          updateData.timeline = [
            ...currentIncident.timeline,
            timelineEvent
          ].map(event => ({
            ...event,
            timestamp: Timestamp.fromDate(event.timestamp)
          }));
        }

        // Set resolved timestamp if status is resolved
        if (updates.status === 'resolved' || updates.status === 'closed') {
          updateData.resolvedAt = serverTimestamp();
        }
      }

      await updateDoc(docRef, updateData);
      
      // Check escalation rules after update
      await this.checkEscalationRules(id);
    } catch (error) {
      console.error('Error updating incident:', error);
      throw error;
    }
  }

  // Get incidents with filters
  async getIncidents(filters?: IncidentFilter): Promise<Incident[]> {
    try {
      let q = query(collection(db, this.collectionName));

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        q = query(q, where('status', 'in', filters.status));
      }
      
      if (filters?.severity && filters.severity.length > 0) {
        q = query(q, where('severity', 'in', filters.severity));
      }
      
      if (filters?.type && filters.type.length > 0) {
        q = query(q, where('type', 'in', filters.type));
      }
      
      if (filters?.assigneeId) {
        q = query(q, where('assignee.id', '==', filters.assigneeId));
      }
      
      if (filters?.reporterId) {
        q = query(q, where('reporter.id', '==', filters.reporterId));
      }

      // Apply sorting
      if (filters?.sortBy) {
        const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';
        q = query(q, orderBy(filters.sortBy, direction));
      } else {
        q = query(q, orderBy('createdAt', 'desc'));
      }

      // Apply limit
      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const incidents: Incident[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        incidents.push({
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
          timeline: data.timeline?.map((event: unknown) => {
            const typedEvent = event as Record<string, unknown>;
            return {
              ...typedEvent,
              timestamp: (typedEvent.timestamp as { toDate: () => Date })?.toDate() || new Date()
            };
          }) || []
        } as Incident);
      });

      return incidents;
    } catch (error) {
      console.error('Error getting incidents:', error);
      throw error;
    }
  }

  // Subscribe to real-time incident updates
  subscribeToIncidents(
    filters: IncidentFilter | undefined,
    callback: (incidents: Incident[]) => void
  ): () => void {
    let q = query(collection(db, this.collectionName));

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }
    
    if (filters?.severity && filters.severity.length > 0) {
      q = query(q, where('severity', 'in', filters.severity));
    }

    q = query(q, orderBy('createdAt', 'desc'));
    
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    return onSnapshot(q, (querySnapshot) => {
      const incidents: Incident[] = [];
      
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        incidents.push({
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
          timeline: data.timeline?.map((event: unknown) => {
            const typedEvent = event as Record<string, unknown>;
            return {
              ...typedEvent,
              timestamp: (typedEvent.timestamp as { toDate: () => Date })?.toDate() || new Date()
            };
          }) || []
        } as Incident);
      });

      callback(incidents);
    });
  }

  // Add comment to incident
  async addComment(incidentId: string, comment: string, actor: User): Promise<void> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) throw new Error('Incident not found');

      const timelineEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        type: 'comment',
        timestamp: new Date(),
        actor,
        description: comment
      };

      const updatedTimeline = [
        ...incident.timeline,
        timelineEvent
      ];

      await this.updateIncident(incidentId, {
        timeline: updatedTimeline
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Auto-assign incident based on routing rules
  private async autoAssignIncident(incidentId: string, type: string, severity: string): Promise<void> {
    try {
      // Simple auto-assignment logic
      const assignmentRules: Record<string, User> = {
        security: { id: 'security-team', name: 'Security Team', email: 'security@openstay.com' },
        technical: { id: 'tech-team', name: 'Technical Support', email: 'tech@openstay.com' },
        payment: { id: 'finance-team', name: 'Finance Team', email: 'finance@openstay.com' },
        legal: { id: 'legal-team', name: 'Legal Team', email: 'legal@openstay.com' },
        abuse: { id: 'safety-team', name: 'Trust & Safety', email: 'safety@openstay.com' }
      };

      const defaultAssignee = { id: 'support-team', name: 'General Support', email: 'support@openstay.com' };
      const assignee = assignmentRules[type] || defaultAssignee;

      await this.updateIncident(incidentId, { assignee });
    } catch (error) {
      console.error('Error auto-assigning incident:', error);
    }
  }

  // Check and apply escalation rules
  private async checkEscalationRules(incidentId: string): Promise<void> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident || incident.status === 'resolved' || incident.status === 'closed') return;

      const now = new Date();
      const createdTime = incident.createdAt;
      const hoursElapsed = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

      // Simple escalation rules
      const escalationThresholds: Record<string, number> = {
        critical: 1, // 1 hour
        high: 4,     // 4 hours
        medium: 12,  // 12 hours
        low: 24      // 24 hours
      };

      const threshold = escalationThresholds[incident.severity] || 24;
      
      if (hoursElapsed > threshold && incident.escalationLevel === 0) {
        await this.escalateIncident(incidentId, 1);
      } else if (hoursElapsed > threshold * 2 && incident.escalationLevel === 1) {
        await this.escalateIncident(incidentId, 2);
      }
    } catch (error) {
      console.error('Error checking escalation rules:', error);
    }
  }

  // Escalate incident
  async escalateIncident(incidentId: string, level: number): Promise<void> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) throw new Error('Incident not found');

      const timelineEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        type: 'escalation',
        timestamp: new Date(),
        actor: { id: 'system', name: 'System', email: 'system@openstay.com' },
        description: `Automatically escalated to Level ${level} due to SLA breach`
      };

      await this.updateIncident(incidentId, {
        escalationLevel: level,
        priority: level >= 2 ? 'urgent' : incident.priority,
        timeline: [...incident.timeline, timelineEvent]
      });
    } catch (error) {
      console.error('Error escalating incident:', error);
      throw error;
    }
  }

  // Get incident metrics
  async getIncidentMetrics(timeRange?: { start: Date; end: Date }): Promise<IncidentMetrics> {
    try {
      let q = query(collection(db, this.collectionName));
      
      if (timeRange) {
        q = query(
          q,
          where('createdAt', '>=', Timestamp.fromDate(timeRange.start)),
          where('createdAt', '<=', Timestamp.fromDate(timeRange.end))
        );
      }

      const querySnapshot = await getDocs(q);
      const incidents: Incident[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        incidents.push({
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate()
        } as Incident);
      });

      // Calculate metrics
      const totalIncidents = incidents.length;
      const openIncidents = incidents.filter(i => ['open', 'in_progress', 'investigating'].includes(i.status)).length;
      const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
      const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
      const escalatedIncidents = incidents.filter(i => i.escalationLevel > 0).length;

      // Calculate average resolution time for resolved incidents
      const resolvedWithTime = incidents.filter(i => i.resolvedAt && i.createdAt);
      const avgResolutionTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, incident) => {
            const resolutionTime = (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / (1000 * 60 * 60);
            return sum + resolutionTime;
          }, 0) / resolvedWithTime.length
        : 0;

      // Calculate SLA compliance (simplified)
      const slaCompliantIncidents = resolvedWithTime.filter(incident => {
        const resolutionTime = (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / (1000 * 60 * 60);
        const slaTarget = incident.severity === 'critical' ? 4 : incident.severity === 'high' ? 12 : 24;
        return resolutionTime <= slaTarget;
      }).length;

      const slaCompliance = resolvedWithTime.length > 0 ? (slaCompliantIncidents / resolvedWithTime.length) * 100 : 100;

      return {
        totalIncidents,
        openIncidents,
        resolvedIncidents,
        criticalIncidents,
        averageResolutionTime: Number(avgResolutionTime.toFixed(2)),
        slaCompliance: Number(slaCompliance.toFixed(1)),
        escalationRate: totalIncidents > 0 ? Number(((escalatedIncidents / totalIncidents) * 100).toFixed(1)) : 0,
        incidentsByType: this.groupByField(incidents, 'type'),
        incidentsBySeverity: this.groupByField(incidents, 'severity'),
        incidentsByStatus: this.groupByField(incidents, 'status'),
        timeRange: timeRange || { start: new Date(0), end: new Date() }
      };
    } catch (error) {
      console.error('Error getting incident metrics:', error);
      throw error;
    }
  }

  // Helper method to group incidents by field
  private groupByField(incidents: Incident[], field: keyof Incident): Record<string, number> {
    return incidents.reduce((acc, incident) => {
      const value = String(incident[field]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Bulk update incidents
  async bulkUpdateIncidents(updates: { id: string; data: Partial<Incident> }[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      updates.forEach(({ id, data }) => {
        const docRef = doc(db, this.collectionName, id);
        batch.update(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating incidents:', error);
      throw error;
    }
  }
}

export const incidentService = new IncidentService();
