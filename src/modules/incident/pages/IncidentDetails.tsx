import React, { useState } from 'react';
import { 
  ArrowLeft,
  Clock,
  User,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X,
  Plus,
  Bell,
  Calendar,
  Activity,
  Flag,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock incident data
const MOCK_INCIDENT = {
  id: 'INC-001',
  title: 'User Data Access Issue',
  description: 'Multiple users reporting inability to access their profile data. The issue appears to be related to the authentication service experiencing intermittent failures.',
  type: 'technical' as const,
  severity: 'high' as const,
  status: 'in_progress' as const,
  priority: 'high' as const,
  reporter: { 
    id: '1', 
    name: 'John Doe', 
    email: 'john@example.com', 
    role: 'user' as const,
    avatar: '/api/placeholder/32/32'
  },
  assignee: { 
    id: '2', 
    name: 'Admin Smith', 
    email: 'admin@openstay.com',
    avatar: '/api/placeholder/32/32'
  },
  createdAt: new Date('2025-01-20T10:30:00'),
  updatedAt: new Date('2025-01-20T11:45:00'),
  tags: ['authentication', 'database', 'user-experience'],
  category: 'platform_security' as const,
  escalationLevel: 1,
  impact: { 
    scope: 'medium' as const, 
    description: 'Affects user login flow and profile access', 
    estimatedAffectedUsers: 150,
    businessImpact: 'Medium - Users cannot access profiles but can still browse listings'
  },
  timeline: [
    {
      id: '1',
      type: 'created',
      timestamp: new Date('2025-01-20T10:30:00'),
      actor: { name: 'John Doe', email: 'john@example.com' },
      description: 'Incident reported: User Data Access Issue'
    },
    {
      id: '2',
      type: 'assigned',
      timestamp: new Date('2025-01-20T10:45:00'),
      actor: { name: 'System', email: 'system@openstay.com' },
      description: 'Automatically assigned to Admin Smith based on routing rules'
    },
    {
      id: '3',
      type: 'comment',
      timestamp: new Date('2025-01-20T11:15:00'),
      actor: { name: 'Admin Smith', email: 'admin@openstay.com' },
      description: 'Investigating authentication service logs. Found increased error rates starting at 10:20 AM.'
    },
    {
      id: '4',
      type: 'status_change',
      timestamp: new Date('2025-01-20T11:30:00'),
      actor: { name: 'Admin Smith', email: 'admin@openstay.com' },
      description: 'Status changed from Open to In Progress'
    },
    {
      id: '5',
      type: 'escalation',
      timestamp: new Date('2025-01-20T11:45:00'),
      actor: { name: 'System', email: 'system@openstay.com' },
      description: 'Automatically escalated to Level 1 due to SLA time threshold'
    }
  ],
  attachments: [
    {
      id: '1',
      name: 'error_logs_auth_service.txt',
      size: '2.4 MB',
      uploadedAt: new Date('2025-01-20T11:20:00'),
      uploadedBy: 'Admin Smith'
    },
    {
      id: '2',
      name: 'user_reports_screenshot.png',
      size: '1.8 MB',
      uploadedAt: new Date('2025-01-20T10:35:00'),
      uploadedBy: 'John Doe'
    }
  ],
  slaTarget: {
    responseTime: 2, // hours
    resolutionTime: 24, // hours
    responseDeadline: new Date('2025-01-20T12:30:00'),
    resolutionDeadline: new Date('2025-01-21T10:30:00')
  },
  metrics: {
    timeToFirstResponse: 0.25, // hours
    timeInProgress: 1.25, // hours
    escalationCount: 1,
    commentCount: 3
  }
};

interface IncidentDetailsProps {
  incidentId?: string;
  onBack?: () => void;
}

const IncidentDetails: React.FC<IncidentDetailsProps> = ({ 
  incidentId = 'INC-001', 
  onBack 
}) => {
  const [incident] = useState(MOCK_INCIDENT);
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editedTitle, setEditedTitle] = useState(incident.title);
  const [editedDescription, setEditedDescription] = useState(incident.description);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-primary-100 text-primary-800';
      case 'investigating': return 'bg-purple-100 text-purple-800';
      case 'waiting_for_response': return 'bg-yellow-100 text-yellow-800';
      case 'escalated': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'created': return <Plus className="w-4 h-4 text-primary-600" />;
      case 'assigned': return <Users className="w-4 h-4 text-green-600" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-gray-600" />;
      case 'status_change': return <Activity className="w-4 h-4 text-purple-600" />;
      case 'escalation': return <Bell className="w-4 h-4 text-orange-600" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleSave = () => {
    // In real implementation, this would save to backend
    setIsEditing(false);
    // Update incident with edited values
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    // In real implementation, this would add comment to backend
    console.log('Adding comment:', newComment);
    setNewComment('');
  };

  const formatTimeElapsed = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  const isSlaAtRisk = () => {
    const now = new Date();
    const timeToDeadline = incident.slaTarget.resolutionDeadline.getTime() - now.getTime();
    const totalSlaTime = incident.slaTarget.resolutionDeadline.getTime() - incident.createdAt.getTime();
    const remainingPercentage = (timeToDeadline / totalSlaTime) * 100;
    
    return remainingPercentage < 25; // At risk if less than 25% time remaining
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-3">
                <span className="font-mono text-lg font-semibold text-gray-900">{incident.id}</span>
                <span className={cn(
                  "px-3 py-1 text-sm font-medium rounded-full border",
                  getSeverityColor(incident.severity)
                )}>
                  {incident.severity.toUpperCase()}
                </span>
                <span className={cn(
                  "px-3 py-1 text-sm font-medium rounded-full",
                  getStatusColor(incident.status)
                )}>
                  {incident.status.replace('_', ' ').toUpperCase()}
                </span>
                {incident.escalationLevel > 0 && (
                  <span className="flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    <Bell className="w-4 h-4" />
                    <span>Level {incident.escalationLevel}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
              
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="investigating">Investigating</option>
                <option value="waiting_for_response">Waiting for Response</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-2xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500 pb-2"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">{incident.description}</p>
                )}
              </div>

              {/* Impact Assessment */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Impact Assessment</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Scope</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{incident.impact.scope}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Affected Users</p>
                      <p className="text-lg font-semibold text-gray-900">~{incident.impact.estimatedAffectedUsers}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Business Impact</p>
                    <p className="text-gray-700">{incident.impact.businessImpact}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {incident.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
                <div className="space-y-2">
                  {incident.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{attachment.name}</p>
                          <p className="text-sm text-gray-600">
                            {attachment.size} • Uploaded by {attachment.uploadedBy} • {formatTimeElapsed(attachment.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Comment</h3>
              <div className="space-y-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment or update..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SLA Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                SLA Status
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600">Response Time</span>
                    <span className="text-sm text-green-600 font-medium">Met</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-full"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {incident.metrics.timeToFirstResponse}h / {incident.slaTarget.responseTime}h target
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600">Resolution Time</span>
                    <span className={cn(
                      "text-sm font-medium",
                      isSlaAtRisk() ? "text-red-600" : "text-yellow-600"
                    )}>
                      {isSlaAtRisk() ? "At Risk" : "In Progress"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={cn(
                      "h-2 rounded-full",
                      isSlaAtRisk() ? "bg-red-500" : "bg-yellow-500",
                      "w-3/4"
                    )}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {incident.metrics.timeInProgress}h / {incident.slaTarget.resolutionTime}h target
                  </p>
                </div>
              </div>
            </div>

            {/* Incident Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reporter</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{incident.reporter.name}</p>
                      <p className="text-xs text-gray-600">{incident.reporter.email}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Assignee</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{incident.assignee.name}</p>
                      <p className="text-xs text-gray-600">{incident.assignee.email}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {incident.createdAt.toLocaleDateString()} at {incident.createdAt.toLocaleTimeString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatTimeElapsed(incident.updatedAt)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Priority</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Flag className={cn(
                      "w-4 h-4",
                      incident.priority === 'high' ? "text-red-600" :
                      incident.priority === 'high' ? "text-orange-600" :
                      incident.priority === 'medium' ? "text-yellow-600" : "text-green-600"
                    )} />
                    <span className="text-sm text-gray-900 capitalize">{incident.priority}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Timeline
              </h3>
              
              <div className="space-y-4">
                {incident.timeline.map((event, index) => (
                  <div key={event.id} className="flex space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {getTimelineIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{event.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">{event.actor.name}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500">{formatTimeElapsed(event.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
