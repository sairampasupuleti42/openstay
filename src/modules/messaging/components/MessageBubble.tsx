import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreHorizontal, 
  Reply, 
  Edit3, 
  Trash2,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { messagingService } from '../services/messagingService';
import { EMOJI_REACTIONS } from '../types';
import type { Message, MessageReaction, EmojiReaction } from '../types';

// Simple time formatting function
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onReact: (emoji: EmojiReaction) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  onReact,
  onReply,
  onEdit,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { currentUser } = useAuth();

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-primary-500" />;
      case 'failed':
        return <div className="w-3 h-3 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  const groupedReactions = message.reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const hasUserReacted = (emoji: string) => {
    return message.reactions.some(r => r.emoji === emoji && r.userId === currentUser?.uid);
  };

  return (
    <div
      className={cn(
        "flex group mb-4 relative",
        isOwn ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Avatar */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium mr-3 mt-1">
          {message.senderPhoto ? (
            <img 
              src={message.senderPhoto} 
              alt={message.senderName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            message.senderName.charAt(0).toUpperCase()
          )}
        </div>
      )}

      <div className={cn("max-w-[70%]", isOwn && "mr-3")}>
        {/* Sender name and timestamp */}
        {!isOwn && showAvatar && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{message.senderName}</span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(message.timestamp)}
            </span>
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            "relative px-4 py-2 rounded-2xl shadow-sm",
            isOwn
              ? "bg-primary-500 text-white rounded-br-md"
              : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
          )}
        >
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={cn(
              "text-xs opacity-75 mb-2 pb-2 border-b",
              isOwn ? "border-blue-400" : "border-gray-200"
            )}>
              Replying to message
            </div>
          )}

          {/* Message text */}
          <div className="break-words">
            {message.content}
          </div>

          {/* Edited indicator */}
          {message.edited && (
            <span className={cn(
              "text-xs opacity-60 ml-2",
              isOwn ? "text-primary-100" : "text-gray-500"
            )}>
              (edited)
            </span>
          )}

          {/* Message status (only for own messages) */}
          {isOwn && (
            <div className="flex justify-end mt-1">
              {getStatusIcon()}
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji as EmojiReaction)}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded-full text-xs border transition-colors",
                  hasUserReacted(emoji)
                    ? "bg-primary-100 border-blue-300 text-primary-700"
                    : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
                )}
              >
                <span>{emoji}</span>
                <span>{reactions.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp for own messages */}
        {isOwn && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            {formatTimeAgo(message.timestamp)}
          </div>
        )}
      </div>

      {/* Message actions */}
      {showActions && (
        <div className={cn(
          "absolute top-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isOwn ? "right-0 -mr-20" : "left-0 -ml-20"
        )}>
          {/* Emoji picker trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-gray-100"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-4 h-4" />
            </Button>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 bottom-full mb-2">
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 hover:bg-gray-100 rounded flex items-center justify-center text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 hover:bg-gray-100"
            onClick={onReply}
          >
            <Reply className="w-4 h-4" />
          </Button>

          {isOwn && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={onEdit}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-red-100 hover:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 hover:bg-gray-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

interface MessageInputProps {
  conversationId: string;
  onSendMessage: (content: string) => void;
  replyTo?: Message;
  onCancelReply?: () => void;
  editingMessage?: Message;
  onCancelEdit?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onSendMessage,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSend = async () => {
    if (!message.trim() || !currentUser) return;

    if (editingMessage) {
      await messagingService.editMessage(editingMessage.id, message.trim());
      onCancelEdit?.();
    } else {
      onSendMessage(message.trim());
    }
    
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (!isTyping && value.length > 0 && currentUser) {
      setIsTyping(true);
      messagingService.updateTypingStatus(conversationId, currentUser.uid, true);
    } else if (isTyping && value.length === 0 && currentUser) {
      setIsTyping(false);
      messagingService.updateTypingStatus(conversationId, currentUser.uid, false);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Replying to <span className="font-medium">{replyTo.senderName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
          <div className="text-sm text-gray-800 truncate mt-1">
            {replyTo.content}
          </div>
        </div>
      )}

      {/* Edit preview */}
      {editingMessage && (
        <div className="mb-3 p-2 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="text-sm text-yellow-700 font-medium">
              Editing message
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="flex items-end space-x-2">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 text-gray-500 hover:text-gray-700"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              editingMessage 
                ? "Edit your message..." 
                : replyTo 
                  ? "Reply to message..." 
                  : "Type a message..."
            }
            className="pr-12 resize-none"
            maxLength={1000}
          />
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          className="mb-2"
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export { MessageBubble, MessageInput };
