import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatSession, QuickAction } from '../types';
import { chatbotService } from '../services/chatbotService';
import ChatbotIcon from './ChatbotIcon';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session when widget opens
  useEffect(() => {
    if (isOpen && !session) {
      const newSession = chatbotService.createSession();
      setSession(newSession);
    }
  }, [isOpen, session]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !session || isTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);
    setShowQuickActions(false);

    try {
      // Simulate typing delay for better UX
      setTimeout(async () => {
        await chatbotService.processMessage(session.id, message);
        setSession(chatbotService.getSession(session.id) || session);
        setIsTyping(false);
      }, 500 + Math.random() * 1000); // Random delay between 0.5-1.5s
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (!session || isTyping) return;

    setIsTyping(true);
    setShowQuickActions(false);

    try {
      // Add user message
      chatbotService.addMessage(session.id, action.label, 'user');
      
      // Add bot response after delay
      setTimeout(() => {
        chatbotService.addMessage(session.id, action.response, 'bot');
        setSession(chatbotService.getSession(session.id) || session);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      console.error('Error processing quick action:', error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const minimizeChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <ChatbotIcon 
        isOpen={isOpen} 
        onClick={toggleChat}
        unreadCount={0}
      />

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-500 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">OS</span>
                </div>
                <div>
                  <h3 className="font-semibold">OpenStay Support</h3>
                  <p className="text-xs text-blue-100">Always here to help</p>
                </div>
              </div>
              <button
                onClick={minimizeChat}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {session?.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {showQuickActions && session && session.messages.length <= 1 && (
            <QuickActions 
              actions={chatbotService.getQuickActions()} 
              onActionClick={handleQuickAction}
            />
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isTyping}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "bg-blue-500 hover:bg-blue-600 text-white"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by OpenStay AI • Always improving
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
