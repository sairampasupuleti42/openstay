import React from 'react';
import type { ChatMessage } from '../types';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessage;
  isLatest?: boolean;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isBot ? "justify-start" : "justify-end"
    )}>
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isBot 
          ? "bg-gray-100 text-gray-900" 
          : "bg-primary-500 text-white"
      )}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>
        <div className={cn(
          "text-xs mt-1 opacity-70",
          isBot ? "text-gray-500" : "text-primary-100"
        )}>
          {formatTime(message.timestamp)}
        </div>
      </div>
      
      {!isBot && (
        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default ChatMessageComponent;
