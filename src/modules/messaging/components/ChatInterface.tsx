import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Video, Info, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { messagingService } from '../services/messagingService';
import { MessageBubble, MessageInput } from './MessageBubble';
import type { Message, Conversation, EmojiReaction } from '../types';

interface ChatInterfaceProps {
  conversation: Conversation;
  currentUserId: string;
  onClose?: () => void;
  isMobile?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  currentUserId,
  onClose,
  isMobile = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | undefined>();
  const [editingMessage, setEditingMessage] = useState<Message | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

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

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadMessages = async () => {
      setLoading(true);
      try {
        unsubscribe = messagingService.subscribeToMessages(
          conversation.id,
          (newMessages) => {
            setMessages(newMessages);
            setLoading(false);
            // Scroll to bottom when new messages arrive
            setTimeout(scrollToBottom, 100);
          }
        );
      } catch (error) {
        console.error('Error loading messages:', error);
        setLoading(false);
      }
    };

    loadMessages();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversation.id, scrollToBottom]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (currentUserId) {
      messagingService.markMessagesAsRead(conversation.id, currentUserId);
    }
  }, [conversation.id, currentUserId]);

  // Handle sending messages
  const handleSendMessage = async (content: string) => {
    if (!currentUser) return;

    try {
      await messagingService.sendMessage(
        conversation.id,
        currentUser.uid,
        content,
        'text',
        replyTo?.id
      );
      setReplyTo(undefined);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle message reactions
  const handleReaction = async (messageId: string, emoji: EmojiReaction) => {
    if (!currentUser) return;

    try {
      await messagingService.addReaction(
        messageId,
        currentUser.uid,
        currentUser.displayName || 'User',
        emoji
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setReplyTo(undefined);
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messagingService.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Group messages by sender and time
  const groupedMessages = messages.reduce((groups: Array<{ message: Message; showAvatar: boolean }>, message, index) => {
    const prevMessage = messages[index - 1];
    const showAvatar = !prevMessage || 
                      prevMessage.senderId !== message.senderId || 
                      (message.timestamp.getTime() - prevMessage.timestamp.getTime()) > 300000; // 5 minutes

    groups.push({ message, showAvatar });
    return groups;
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="mr-2 p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium overflow-hidden mr-3">
            {displayAvatar ? (
              <img 
                src={displayAvatar} 
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-500">
              {conversation.isTyping.length > 0 ? 'Typing...' : 'Active now'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <Info className="w-5 h-5" />
          </Button>
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                {displayAvatar ? (
                  <img 
                    src={displayAvatar} 
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-2xl text-gray-400">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{displayName}</h3>
              <p className="text-sm">Start your conversation with {displayName}</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map(({ message, showAvatar }) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                showAvatar={showAvatar}
                onReact={(emoji) => handleReaction(message.id, emoji)}
                onReply={() => setReplyTo(message)}
                onEdit={() => handleEditMessage(message)}
                onDelete={() => handleDeleteMessage(message.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <MessageInput
        conversationId={conversation.id}
        onSendMessage={handleSendMessage}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(undefined)}
      />
    </div>
  );
};

export default ChatInterface;
