import React from 'react';
import { Search, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Conversation } from '../types';

// Simple time formatting function
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  return date.toLocaleDateString();
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId?: string;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  onClick,
}) => {
  // Get the other participant for direct messages
  const otherParticipant = conversation.type === 'direct' 
    ? conversation.participants.find(p => p.userId !== currentUserId)
    : null;

  const displayName = conversation.type === 'direct' && otherParticipant
    ? otherParticipant.userName
    : conversation.name || 'Group Chat';

  const displayAvatar = conversation.type === 'direct' && otherParticipant
    ? otherParticipant.userPhoto
    : conversation.avatar;

  const lastMessagePreview = conversation.lastMessage?.content || 'No messages yet';
  const truncatedPreview = lastMessagePreview.length > 50 
    ? lastMessagePreview.substring(0, 50) + '...'
    : lastMessagePreview;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center p-3 cursor-pointer border-l-4 transition-all duration-200 hover:bg-gray-50",
        isActive 
          ? "bg-primary-50 border-blue-500 border-l-4" 
          : "border-transparent hover:border-gray-200"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium overflow-hidden">
          {displayAvatar ? (
            <img 
              src={displayAvatar} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg">
              {conversation.type === 'group' ? (
                <Users className="w-6 h-6" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </span>
          )}
        </div>
        
        {/* Online indicator */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
      </div>

      {/* Conversation details */}
      <div className="flex-1 ml-3 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            "font-medium truncate",
            isActive ? "text-primary-900" : "text-gray-900"
          )}>
            {displayName}
          </h4>
          
          <div className="flex items-center space-x-2">
            {conversation.lastMessage && (
              <span className="text-xs text-gray-500">
                {formatTimeAgo(conversation.lastMessage.timestamp)}
              </span>
            )}
            
            {conversation.unreadCount > 0 && (
              <div className="bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-600 truncate flex-1">
            {conversation.lastMessage?.senderId === currentUserId && 'You: '}
            {truncatedPreview}
          </p>
          
          {/* Typing indicator */}
          {conversation.isTyping.length > 0 && (
            <div className="flex items-center space-x-1 ml-2">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-primary-500">typing</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUserId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  loading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  currentUserId,
  onConversationSelect,
  onNewConversation,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const otherParticipant = conversation.type === 'direct' 
      ? conversation.participants.find(p => p.userId !== currentUserId)
      : null;
    
    const displayName = conversation.type === 'direct' && otherParticipant
      ? otherParticipant.userName
      : conversation.name || 'Group Chat';
    
    return displayName.toLowerCase().includes(query) ||
           conversation.lastMessage?.content.toLowerCase().includes(query);
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MessageCircle className="w-6 h-6 mr-2 text-primary-500" />
            Messages
          </h2>
          <Button
            onClick={onNewConversation}
            size="sm"
            className="bg-primary-500 hover:bg-primary-600"
          >
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? (
              <>
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No conversations found</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new conversation with someone you follow</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                currentUserId={currentUserId}
                onClick={() => onConversationSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
