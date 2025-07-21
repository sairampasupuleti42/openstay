import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  Filter, 
  Plus, 
  Search,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Activity,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const MOCK_INCIDENTS = [
  {
    id: 'INC-001',
    title: 'User Data Access Issue',
    description: 'Multiple users reporting inability to access their profile data',
    type: 'technical' as const,
    severity: 'high' as const,
    status: 'open' as const,
    priority: 'high' as const,
    reporter: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' as const },
    assignee: { id: '2', name: 'Admin Smith', email: 'admin@openstay.com' },
    createdAt: new Date('2025-01-20T10:30:00'),
    updatedAt: new Date('2025-01-20T11:45:00'),
    tags: ['authentication', 'database'],
    category: 'platform_security' as const,
    escalationLevel: 1,
    impact: { scope: 'medium' as const, description: 'Affects user login flow', estimatedAffectedUsers: 150 }
  },
  {
    id: 'INC-002',
    title: 'Payment Processing Failure',
    description: 'Credit card payments failing with gateway timeout',
    type: 'payment' as const,
    severity: 'critical' as const,
    status: 'in_progress' as const,
    priority: 'urgent' as const,
    reporter: { id: '3', name: 'Jane Manager', email: 'jane@openstay.com', role: 'admin' as const },
    assignee: { id: '4', name: 'Tech Lead', email: 'tech@openstay.com' },
    createdAt: new Date('2025-01-20T09:15:00'),
    updatedAt: new Date('2025-01-20T12:00:00'),
    tags: ['payment', 'gateway', 'critical'],
    category: 'payment_processing' as const,
    escalationLevel: 2,
    impact: { scope: 'high' as const, description: 'All payments affected', estimatedAffectedUsers: 500 }
  },
  {
    id: 'INC-003',
    title: 'Inappropriate Content Report',
    description: 'User reported inappropriate property listing photos',
    type: 'user_report' as const,
    severity: 'medium' as const,
    status: 'resolved' as const,
    priority: 'medium' as const,
    reporter: { id: '5', name: 'User Reporter', email: 'reporter@example.com', role: 'user' as const },
    assignee: { id: '6', name: 'Content Mod', email: 'mod@openstay.com' },
    createdAt: new Date('2025-01-19T14:20:00'),
    updatedAt: new Date('2025-01-20T08:30:00'),
    resolvedAt: new Date('2025-01-20T08:30:00'),
    tags: ['content', 'moderation'],
    category: 'content_moderation' as const,
    escalationLevel: 0,
    impact: { scope: 'low' as const, description: 'Single listing affected', estimatedAffectedUsers: 1 }
  }
];

const MOCK_METRICS = {
  totalIncidents: 156,
  openIncidents: 23,
  criticalIncidents: 3,
  averageResolutionTime: 4.2, // hours
  slaCompliance: 94.5, // percentage
  escalationRate: 12.3 // percentage
};

type IncidentType = 'security' | 'technical' | 'service_outage' | 'data_breach' | 'user_report' | 'abuse' | 'fraud' | 'payment' | 'legal' | 'compliance' | 'other';
type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'open' | 'in_progress' | 'investigating' | 'waiting_for_response' | 'escalated' | 'resolved' | 'closed' | 'on_hold';
type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

const IncidentResponseDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [filteredIncidents, setFilteredIncidents] = useState(MOCK_INCIDENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<{
    status: IncidentStatus[];
    severity: IncidentSeverity[];
    type: IncidentType[];
    priority: IncidentPriority[];
  }>({
    status: [],
    severity: [],
    type: [],
    priority: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  // Filter incidents based on search and filters
  useEffect(() => {
    let filtered = incidents;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedFilters.status.length > 0) {
      filtered = filtered.filter(incident => selectedFilters.status.includes(incident.status));
    }

    // Apply severity filter
    if (selectedFilters.severity.length > 0) {
      filtered = filtered.filter(incident => selectedFilters.severity.includes(incident.severity));
    }

    // Apply type filter
    if (selectedFilters.type.length > 0) {
      filtered = filtered.filter(incident => selectedFilters.type.includes(incident.type));
    }

    // Apply priority filter
    if (selectedFilters.priority.length > 0) {
      filtered = filtered.filter(incident => selectedFilters.priority.includes(incident.priority));
    }

    setFilteredIncidents(filtered);
  }, [incidents, searchTerm, selectedFilters]);

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'investigating': return 'bg-purple-100 text-purple-800';
      case 'waiting_for_response': return 'bg-yellow-100 text-yellow-800';
      case 'escalated': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: IncidentPriority) => {
    switch (priority) {
      case 'urgent': return <ArrowUp className="w-4 h-4 text-red-600" />;
      case 'high': return <ArrowUp className="w-4 h-4 text-orange-600" />;
      case 'medium': return <ArrowDown className="w-4 h-4 text-yellow-600" />;
      case 'low': return <ArrowDown className="w-4 h-4 text-green-600" />;
      default: return null;
    }
  };

  const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value as never)
        ? prev[filterType].filter(item => item !== value)
        : [...prev[filterType], value as never]
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      status: [],
      severity: [],
      type: [],
      priority: []
    });
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-7 h-7 text-red-600 mr-3" />
                Incident Response Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor, manage, and resolve platform incidents</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Report Incident</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{MOCK_METRICS.totalIncidents}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open</p>
                <p className="text-2xl font-bold text-orange-600">{MOCK_METRICS.openIncidents}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{MOCK_METRICS.criticalIncidents}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-green-600">{MOCK_METRICS.averageResolutionTime}h</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
                <p className="text-2xl font-bold text-blue-600">{MOCK_METRICS.slaCompliance}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Escalation Rate</p>
                <p className="text-2xl font-bold text-purple-600">{MOCK_METRICS.escalationRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors",
                  showFilters 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {(selectedFilters.status.length + selectedFilters.severity.length + selectedFilters.type.length + selectedFilters.priority.length) > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {selectedFilters.status.length + selectedFilters.severity.length + selectedFilters.type.length + selectedFilters.priority.length}
                  </span>
                )}
              </button>
              
              {(selectedFilters.status.length + selectedFilters.severity.length + selectedFilters.type.length + selectedFilters.priority.length) > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                <div className="space-y-2">
                  {['open', 'in_progress', 'investigating', 'resolved', 'closed'].map(status => (
                    <label key={status} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters.status.includes(status as IncidentStatus)}
                        onChange={() => handleFilterChange('status', status)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Severity Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Severity</h4>
                <div className="space-y-2">
                  {['critical', 'high', 'medium', 'low'].map(severity => (
                    <label key={severity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters.severity.includes(severity as IncidentSeverity)}
                        onChange={() => handleFilterChange('severity', severity)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{severity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Type</h4>
                <div className="space-y-2">
                  {['security', 'technical', 'payment', 'user_report', 'abuse'].map(type => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters.type.includes(type as IncidentType)}
                        onChange={() => handleFilterChange('type', type)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
                <div className="space-y-2">
                  {['urgent', 'high', 'medium', 'low'].map(priority => (
                    <label key={priority} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters.priority.includes(priority as IncidentPriority)}
                        onChange={() => handleFilterChange('priority', priority)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{priority}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Incidents List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Incidents ({filteredIncidents.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className={cn(
                  "p-6 hover:bg-gray-50 cursor-pointer transition-colors",
                  selectedIncident === incident.id && "bg-blue-50"
                )}
                onClick={() => setSelectedIncident(selectedIncident === incident.id ? null : incident.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-mono text-sm text-gray-600">{incident.id}</span>
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full border",
                        getSeverityColor(incident.severity)
                      )}>
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        getStatusColor(incident.status)
                      )}>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <div className="flex items-center">
                        {getPriorityIcon(incident.priority)}
                        <span className="ml-1 text-xs text-gray-500 capitalize">{incident.priority}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{incident.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{incident.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>Reporter: {incident.reporter.name}</span>
                      </div>
                      {incident.assignee && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>Assigned: {incident.assignee.name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Created: {incident.createdAt.toLocaleDateString()}</span>
                      </div>
                      {incident.escalationLevel > 0 && (
                        <div className="flex items-center space-x-1">
                          <Bell className="w-4 h-4 text-orange-500" />
                          <span className="text-orange-600">Escalation Level {incident.escalationLevel}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-3">
                      {incident.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-xs text-gray-500">
                      Impact: {incident.impact.scope}
                    </div>
                    <div className="text-xs text-gray-500">
                      ~{incident.impact.estimatedAffectedUsers} users
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedIncident === incident.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Impact Details</h4>
                        <p className="text-sm text-gray-600 mb-2">{incident.impact.description}</p>
                        <p className="text-sm text-gray-500">Estimated affected users: {incident.impact.estimatedAffectedUsers}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Quick Actions</h4>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                            Assign to Me
                          </button>
                          <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                            Mark Resolved
                          </button>
                          <button className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700">
                            Escalate
                          </button>
                          <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">
                            Add Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredIncidents.length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentResponseDashboard;
