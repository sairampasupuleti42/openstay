# Social Features Implementation

This document provides comprehensive documentation for the social networking features implemented in the Openstay platform.

## Overview

The social features enable users to:
- Discover and connect with other community members
- Follow/unfollow other users
- View followers and following lists
- Receive notifications for social activities
- Block unwanted users
- Search and filter community members

## Architecture

The social functionality is implemented as a lazy-loaded module (`/src/modules/social/`) to maintain optimal bundle size and performance.

### Module Structure

```
src/modules/social/
├── components/
│   └── UserCard.tsx           # Reusable user display component
├── pages/
│   ├── FollowersPage.tsx      # Protected page showing user's followers
│   └── FollowingPage.tsx      # Protected page showing who user follows
└── services/
    ├── socialService.ts       # Core social functionality
    └── notificationService.ts # Notification management
```

## Components

### UserCard Component

**Location**: `/src/modules/social/components/UserCard.tsx`

A versatile component for displaying user information with social actions.

**Props**:
- `user: UserProfile` - User data to display
- `currentUserId?: string` - Current user's ID for conditional rendering
- `variant?: 'grid' | 'list'` - Display layout (default: 'grid')
- `showActions?: boolean` - Show follow/message buttons (default: true)
- `isFollowing?: boolean` - Current following status
- `onFollow?: (userId: string) => void` - Follow action callback
- `onUnfollow?: (userId: string) => void` - Unfollow action callback
- `onMessage?: (userId: string) => void` - Message action callback

**Features**:
- Responsive grid and list layouts
- Profile image with fallback
- Host/Guest ratings display
- Verification badges
- Location and bio information
- Interactive follow/unfollow buttons
- Message functionality (placeholder)

### Pages

#### FollowersPage

**Location**: `/src/modules/social/pages/FollowersPage.tsx`

Protected page displaying users who follow the current user.

**Features**:
- Authentication required
- Real-time follower list
- Search and filter capabilities
- Empty state handling
- Loading states

#### FollowingPage

**Location**: `/src/modules/social/pages/FollowingPage.tsx`

Protected page displaying users the current user follows.

**Features**:
- Authentication required
- Real-time following list
- Unfollow functionality
- Search and filter capabilities
- Empty state handling
- Loading states

## Services

### SocialService

**Location**: `/src/modules/social/services/socialService.ts`

Core service managing all social interactions.

**Methods**:

```typescript
// Follow a user
followUser(currentUserId: string, targetUserId: string): Promise<void>

// Unfollow a user
unfollowUser(currentUserId: string, targetUserId: string): Promise<void>

// Check if current user follows target user
isFollowing(currentUserId: string, targetUserId: string): Promise<boolean>

// Get user's followers
getFollowers(userId: string): Promise<UserProfile[]>

// Get users that user follows
getFollowing(userId: string): Promise<UserProfile[]>

// Block a user
blockUser(currentUserId: string, targetUserId: string): Promise<void>

// Unblock a user
unblockUser(currentUserId: string, targetUserId: string): Promise<void>

// Check if user is blocked
isBlocked(currentUserId: string, targetUserId: string): Promise<boolean>

// Get blocked users
getBlockedUsers(userId: string): Promise<UserProfile[]>
```

**Database Operations**:
- Updates user documents in Firestore
- Maintains bidirectional relationships
- Atomic operations for data consistency

### NotificationService

**Location**: `/src/modules/social/services/notificationService.ts`

Manages all notification functionality for social activities.

**Notification Types**:
- `follow` - When someone follows the user
- `message` - When someone sends a message
- `stay_interest` - When someone shows interest in a stay
- `review_received` - When someone leaves a review

**Methods**:

```typescript
// Send a notification
sendNotification(notification: CreateNotificationData): Promise<string>

// Get user's notifications
getUserNotifications(userId: string, limit?: number): Promise<Notification[]>

// Mark notification as read
markAsRead(notificationId: string): Promise<void>

// Mark all notifications as read
markAllAsRead(userId: string): Promise<void>

// Get unread count
getUnreadCount(userId: string): Promise<number>

// Delete notification
deleteNotification(notificationId: string): Promise<void>
```

**Features**:
- Real-time notifications
- Read/unread status tracking
- Notification categorization
- Automatic cleanup of old notifications

## Database Schema

### Users Collection Enhancement

The existing `users` collection has been enhanced with social features:

```typescript
interface UserProfile {
  // ... existing fields
  followers: string[];          // Array of follower user IDs
  following: string[];          // Array of following user IDs
  blockedUsers?: string[];      // Array of blocked user IDs
}
```

### Notifications Collection

New collection for storing user notifications:

```typescript
interface Notification {
  id: string;
  userId: string;              // Recipient user ID
  type: 'follow' | 'message' | 'stay_interest' | 'review_received';
  fromUserId: string;          // Sender user ID
  fromUserName: string;        // Sender display name
  fromUserPhoto?: string;      // Sender profile photo
  message: string;             // Notification message
  data?: {                     // Additional data based on type
    stayId?: string;
    reviewId?: string;
    messageId?: string;
  };
  read: boolean;               // Read status
  createdAt: Date;            // Creation timestamp
}
```

## Routing

Social features are integrated into the main application routing with lazy loading:

```typescript
// Protected social routes
{
  path: '/social/followers',
  element: (
    <ProtectedRoute>
      <OnboardingGuard>
        <Suspense fallback={<PageLoader />}>
          <FollowersPage />
        </Suspense>
      </OnboardingGuard>
    </ProtectedRoute>
  )
},
{
  path: '/social/following',
  element: (
    <ProtectedRoute>
      <OnboardingGuard>
        <Suspense fallback={<PageLoader />}>
          <FollowingPage />
        </Suspense>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}
```

## UI Integration

### Header Component Updates

**Location**: `/src/components/Header.tsx`

**Changes Made**:
- Removed dashboard menu links
- Removed duplicate mobile authentication buttons
- Simplified mobile navigation structure

### UserProfileDropdown Enhancement

**Location**: `/src/components/UserProfileDropdown.tsx`

**New Features**:
- Navigation links to followers/following pages
- Social activity indicators
- Quick access to social features

### Explore Page Enhancement

**Location**: `/src/pages/Explore.tsx`

**New Features**:
- Community member discovery
- User search and filtering
- Follow/unfollow functionality
- Grid and list view modes
- Pagination for large user lists
- Real-time following status updates

## Security Considerations

### Privacy Controls
- Users can block unwanted interactions
- Profile visibility controls
- Secure user data handling

### Data Validation
- Input sanitization for all user data
- Firestore security rules for data access
- Authentication verification for all operations

### Rate Limiting
- Prevents spam following/unfollowing
- Notification frequency controls
- Database operation throttling

## Performance Optimizations

### Lazy Loading
- Social module loads only when accessed
- Reduces initial bundle size
- Improves page load performance

### Efficient Queries
- Paginated user lists
- Indexed database queries
- Minimal data transfer

### Caching Strategy
- Local state management for frequently accessed data
- Smart component re-rendering
- Optimistic UI updates

## Testing Considerations

### Unit Tests
- Service method functionality
- Component rendering
- User interaction handling

### Integration Tests
- Database operations
- Authentication flows
- Notification delivery

### E2E Tests
- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness

## Future Enhancements

### Planned Features
1. **Real-time Chat**: Direct messaging between users
2. **Activity Feed**: Timeline of social activities
3. **User Recommendations**: AI-powered user suggestions
4. **Privacy Settings**: Granular privacy controls
5. **Social Login**: OAuth integration
6. **Push Notifications**: Browser and mobile push notifications

### Performance Improvements
1. **Virtual Scrolling**: For large user lists
2. **Image Optimization**: WebP format and lazy loading
3. **Offline Support**: PWA capabilities for social features
4. **CDN Integration**: Global content delivery

## Troubleshooting

### Common Issues

**Users not loading in Explore page**:
- Check Firestore security rules
- Verify authentication status
- Check browser console for errors

**Follow/unfollow not working**:
- Verify user authentication
- Check network connectivity
- Ensure proper error handling

**Notifications not appearing**:
- Check notification service configuration
- Verify user permissions
- Check database write operations

### Debug Commands

```bash
# Check Firebase configuration
npm run firebase:config

# Validate Firestore rules
npm run firestore:rules:validate

# Test social service functions
npm run test -- --grep "social"
```

## Deployment

### Prerequisites
- Firebase project setup
- Firestore database configuration
- Authentication providers enabled

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Build Commands
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## Support

For questions or issues related to social features:

1. Check this documentation
2. Review component props and service methods
3. Test in development environment
4. Check browser console for errors
5. Verify Firebase configuration

## Changelog

### Version 1.0.0 (Current)
- ✅ Initial social module implementation
- ✅ User discovery and following system
- ✅ Notification infrastructure
- ✅ Protected social pages
- ✅ Header and navigation updates
- ✅ Explore page enhancement
- ✅ Lazy loading implementation
- ✅ Comprehensive documentation

### Upcoming Features
- 🔄 Real-time messaging system
- 🔄 Enhanced notification types
- 🔄 User recommendation engine
- 🔄 Advanced privacy controls
