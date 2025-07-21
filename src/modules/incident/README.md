# Incident Module

This module contains all incident-related functionality for the Openstay platform, including security incident reporting, incident management, and administrative dashboard components.

## Module Structure

```
src/modules/incident/
├── components/           # Reusable incident-related components
│   └── IncidentReportForm.tsx    # Main incident reporting form
├── pages/               # Full page components for incident management
│   ├── IncidentResponseDashboard.tsx  # Admin dashboard for managing incidents
│   └── IncidentDetails.tsx            # Detailed incident view page
├── services/            # Business logic and API services
│   └── incidentService.ts       # Core incident service with CRUD operations
├── types/               # TypeScript type definitions
│   └── incident.ts              # Incident-related interfaces and types
├── index.ts             # Module exports (barrel file)
└── README.md            # This file
```

## Components

### IncidentReportForm
A comprehensive form component for users to report security incidents, technical issues, and other platform-related problems.

**Features:**
- Multi-step form with validation
- File attachment support (drag & drop)
- Severity and priority classification
- Real-time form state management
- Success/error handling

**Usage:**
```tsx
import { IncidentReportForm } from '@/modules/incident';

<IncidentReportForm
  onClose={() => setShowForm(false)}
  onSubmit={(data) => handleIncidentSubmit(data)}
/>
```

## Pages

### IncidentResponseDashboard
Administrative dashboard for incident management and monitoring.

**Features:**
- Real-time incident list with filtering
- Status management and assignment
- Metrics and analytics
- Search and sort capabilities

### IncidentDetails
Detailed view for individual incidents with full management capabilities.

**Features:**
- Complete incident information display
- Status and assignment management
- Comment/note system
- Timeline tracking

## Services

### incidentService
Core service handling all incident-related operations.

**Methods:**
- `createIncident(data)` - Create new incident
- `getIncidents(filters)` - Retrieve incidents with filters
- `updateIncident(id, data)` - Update existing incident
- `assignIncident(id, assigneeId)` - Assign incident to team member
- `addComment(id, comment)` - Add comment to incident

## Types

### Core Interfaces
- `Incident` - Main incident data structure
- `IncidentReporter` - User who reported the incident
- `IncidentComment` - Comment/note on an incident
- `IncidentStatus` - Status enumeration
- `IncidentSeverity` - Severity levels
- `IncidentType` - Incident categories

## Usage Examples

### Basic Incident Reporting
```tsx
import { IncidentReportForm, IncidentReportData } from '@/modules/incident';

const handleIncidentReport = (data: IncidentReportData) => {
  console.log('Incident reported:', data);
  // Handle the incident submission
};

<IncidentReportForm onSubmit={handleIncidentReport} />
```

### Admin Dashboard Integration
```tsx
import { IncidentResponseDashboard } from '@/modules/incident';

// In your admin routes
<Route 
  path="/admin/incidents" 
  element={<IncidentResponseDashboard />} 
/>
```

### Using Incident Service
```tsx
import { incidentService } from '@/modules/incident';

// Create a new incident
const newIncident = await incidentService.createIncident({
  title: 'Security Issue',
  description: 'Detailed description...',
  type: 'security',
  severity: 'high',
  // ... other fields
});

// Get all incidents
const incidents = await incidentService.getIncidents();

// Update incident status
await incidentService.updateIncident(incidentId, {
  status: 'resolved'
});
```

## Security Considerations

- All incident data is treated as confidential
- Access control is enforced at the service level
- File attachments are validated and scanned
- Audit logging is implemented for all operations
- Data encryption in transit and at rest

## Development

### Adding New Components
1. Create component in `components/` directory
2. Export from `index.ts`
3. Add appropriate TypeScript types
4. Include tests if applicable

### Extending Services
1. Add new methods to `incidentService`
2. Update type definitions as needed
3. Ensure proper error handling
4. Update documentation

## Integration Points

### Router Integration
The incident module integrates with the main application router:
- `/admin/incidents` - Dashboard page
- `/admin/incidents/:id` - Detail page

### Header Integration
The incident report form is accessible from the main application header for quick incident reporting.

### Authentication
All incident operations require proper authentication and authorization levels based on user roles.
