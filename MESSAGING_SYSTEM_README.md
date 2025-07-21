# Messaging Module

A comprehensive in-app messaging system inspired by Microsoft Teams, featuring real-time chat, message reactions, and seamless integration with the social features.

## Features

### 🎯 **Core Messaging**
- **Real-time Chat**: Instant messaging with live updates
- **Message Status**: Delivery and read receipts with status indicators
- **Typing Indicators**: Live typing status display
- **Message Threading**: Reply to specific messages
- **Message Editing**: Edit sent messages with edit indicators
- **Message Deletion**: Remove messages with confirmation

### 😀 **Message Reactions**
- **10 Emoji Reactions**: 👍 ❤️ 😂 😮 😢 😡 👏 🎉 🔥 💯
- **Reaction Counts**: Group reactions by emoji with user counts
- **Visual Feedback**: Highlight user's own reactions
- **Quick Access**: Hover actions for easy reaction addition

### 🔒 **Privacy & Security**
- **Mutual Following**: Users can only message people they both follow
- **Conversation Verification**: Automatic follow relationship checks
- **Secure Data**: Firebase Firestore security rules implementation
- **User Authentication**: Full authentication integration

### 📱 **Responsive Design**
- **Mobile-First**: Optimized for mobile devices
- **Desktop Experience**: Full-featured desktop interface
- **Adaptive Layout**: Seamless transition between screen sizes
- **Touch-Friendly**: Optimized touch interactions

## Architecture

### 📁 **Module Structure**
```
src/modules/messaging/
├── components/
│   ├── MessageBubble.tsx       # Individual message display with reactions
│   ├── ChatInterface.tsx       # Main chat conversation view
│   └── ConversationList.tsx    # List of user conversations
├── pages/
│   └── MessagingPage.tsx       # Main messaging page with layout
├── services/
│   └── messagingService.ts     # Core messaging functionality
├── types/
│   └── index.ts               # TypeScript type definitions
└── index.ts                   # Module exports
```

### 🔧 **Service Layer**
- **MessagingService**: Core service managing all messaging operations
- **Real-time Subscriptions**: Firebase Firestore real-time listeners
- **Conversation Management**: Create, find, and manage conversations
- **Message Operations**: Send, edit, delete, and react to messages
- **Typing Management**: Handle typing status updates

## Components

### MessageBubble
**Microsoft Teams-inspired message display**

**Features**:
- Sender avatar and name display
- Message timestamp with relative formatting
- Message status indicators (sending, sent, delivered, read)
- Reaction display with grouped emoji counts
- Hover actions menu (react, reply, edit, delete)
- Edit indicator for modified messages
- Reply thread indicators

**Props**:
```typescript
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onReact: (emoji: EmojiReaction) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
```

### MessageInput
**Smart message input with rich features**

**Features**:
- Real-time typing indicators
- Reply preview with cancel option
- Edit mode with visual feedback
- Emoji picker integration
- File attachment support (UI ready)
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### ConversationList
**Microsoft Teams-style conversation sidebar**

**Features**:
- Search conversations by name or content
- Unread message badges
- Last message preview
- Typing indicators
- Online status indicators
- New conversation creation

### ChatInterface
**Full-featured chat interface**

**Features**:
- Conversation header with participant info
- Auto-scrolling message history
- Message grouping by sender and time
- Action buttons (call, video, info)
- Mobile-responsive design
- Loading states and empty states

## Database Schema

### Messages Collection
```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  reactions: MessageReaction[];
  replyTo?: string;
  attachments?: MessageAttachment[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}
```

### Conversations Collection
```typescript
interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  lastActivity: Date;
  unreadCount: number;
  isTyping: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Reactions
```typescript
interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
  timestamp: Date;
}
```

## Integration

### 🔗 **Social Module Integration**
- **Follow Verification**: Checks mutual following before allowing conversations
- **User Discovery**: Integration with social user search and discovery
- **Profile Integration**: Access to user profiles and social data

### 🎨 **UI/UX Integration**
- **Header Integration**: Messages button with unread count badge
- **Navigation**: Seamless routing integration
- **Theme Consistency**: Matches application design system
- **Loading States**: Consistent loading indicators

### 📱 **Mobile Experience**
- **Responsive Layout**: Adaptive design for all screen sizes
- **Touch Optimization**: Touch-friendly interaction areas
- **Navigation**: Mobile-specific navigation patterns
- **Performance**: Optimized for mobile performance

## Usage

### Basic Usage
```typescript
import { MessagingPage } from '@/modules/messaging';

// Use in router
{
  path: '/messages',
  element: (
    <ProtectedRoute requireOnboarding={true}>
      <Suspense fallback={<LazyLoadSpinner />}>
        <MessagingPage />
      </Suspense>
    </ProtectedRoute>
  )
}
```

### Service Usage
```typescript
import { messagingService } from '@/modules/messaging';

// Create conversation
const conversationId = await messagingService.createConversation([userId1, userId2]);

// Send message
await messagingService.sendMessage(conversationId, senderId, 'Hello!');

// Add reaction
await messagingService.addReaction(messageId, userId, userName, '👍');

// Subscribe to messages
const unsubscribe = messagingService.subscribeToMessages(
  conversationId,
  (messages) => setMessages(messages)
);
```

## Performance Optimizations

### 🚀 **Code Splitting**
- Lazy loading with React.lazy()
- Separate webpack chunk for messaging module
- On-demand loading for better initial page performance

### ⚡ **Real-time Efficiency**
- Firebase Firestore optimized queries
- Pagination for message history
- Efficient subscription management
- Automatic cleanup of listeners

### 💾 **Data Management**
- Local state management for active conversations
- Smart caching of user data
- Optimistic UI updates for immediate feedback
- Efficient re-rendering with React optimization

## Security Considerations

### 🔐 **Privacy Controls**
- **Mutual Following Requirement**: Prevents spam and unwanted messages
- **User Verification**: Authentication required for all operations
- **Data Validation**: Input sanitization and validation
- **Secure Queries**: Firestore security rules enforcement

### 🛡️ **Data Protection**
- **User Consent**: Clear messaging permissions
- **Data Encryption**: Firebase security features
- **Access Control**: User-specific data access
- **Audit Trail**: Message tracking and logging

## Future Enhancements

### 🎯 **Planned Features**
1. **File Sharing**: Image and document sharing capabilities
2. **Voice Messages**: Audio message recording and playback
3. **Video Calls**: Integrated video calling functionality
4. **Message Search**: Full-text search across conversations
5. **Message Forwarding**: Share messages between conversations
6. **Custom Reactions**: User-defined emoji reactions
7. **Message Templates**: Quick response templates
8. **Group Chat Management**: Admin controls for group conversations

### 📈 **Performance Improvements**
1. **Virtual Scrolling**: For large conversation histories
2. **Message Caching**: Local storage for offline access
3. **Image Optimization**: WebP format and compression
4. **Push Notifications**: Browser and mobile push notifications

## Troubleshooting

### Common Issues

**Messages not loading**:
- Check Firebase configuration
- Verify authentication status
- Check browser console for errors
- Ensure mutual following relationship

**Real-time updates not working**:
- Verify Firebase connection
- Check network connectivity
- Ensure proper subscription cleanup
- Check Firestore security rules

**Reactions not appearing**:
- Verify user authentication
- Check message permissions
- Ensure proper error handling
- Validate emoji reaction format

### Debug Commands
```bash
# Check Firebase configuration
npm run firebase:config

# Validate Firestore rules
npm run firestore:rules:validate

# Test messaging service functions
npm run test -- --grep "messaging"
```

## Dependencies

### Required Packages
- **React 18+**: Core React functionality
- **Firebase v9+**: Backend services and real-time data
- **Lucide React**: Icon components
- **React Router**: Navigation and routing

### Integration Dependencies
- **Social Module**: User following verification
- **Auth Context**: User authentication
- **UI Components**: Shared component library

## Deployment

### Environment Setup
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

## Conclusion

The messaging module provides a complete, feature-rich chat experience that integrates seamlessly with the Openstay platform's social features. With its Microsoft Teams-inspired design, real-time capabilities, and comprehensive feature set, it enables meaningful communication between community members while maintaining privacy and security standards.
