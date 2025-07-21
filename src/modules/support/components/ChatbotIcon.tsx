import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatbotIconProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

const ChatbotIcon: React.FC<ChatbotIconProps> = ({ isOpen, onClick, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-50",
        "flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300",
        isOpen 
          ? "bg-gray-600 hover:bg-gray-700" 
          : "bg-blue-500 hover:bg-blue-600"
      )}
      aria-label={isOpen ? "Close chat" : "Open support chat"}
    >
      {/* Unread badge */}
      {!isOpen && unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
      
      {/* Icon with smooth transition */}
      <div className="relative">
        <MessageCircle 
          className={cn(
            "w-6 h-6 text-white transition-all duration-300",
            isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )} 
        />
        <X 
          className={cn(
            "w-6 h-6 text-white absolute inset-0 transition-all duration-300",
            isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )} 
        />
      </div>
      
      {/* Pulse animation when closed */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
      )}
    </button>
  );
};

export default ChatbotIcon;
