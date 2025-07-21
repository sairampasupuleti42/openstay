import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Minimize2, RotateCcw } from 'lucide-react';
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
    if (messagesEndRef.current) {
      messagesEndRef.current.parentElement?.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    if (e.key === 'Escape' && showResetConfirm) {
      e.preventDefault();
      cancelReset();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const minimizeChat = () => {
    setIsOpen(false);
  };

  const handleResetChat = () => {
    if (!session) return;
    
    try {
      const resetSession = chatbotService.resetSession(session.id);
      setSession(resetSession);
      setShowQuickActions(true);
      setShowResetConfirm(false);
      setInputMessage('');
      
      // Focus input after reset
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const confirmReset = () => {
    setShowResetConfirm(true);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
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
          <div className="bg-primary-500 text-white p-3 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">OS</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">OpenStay Support</h3>
                  <p className="text-xs text-primary-100">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {/* Reset Button */}
                <button
                  onClick={confirmReset}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {/* Minimize Button */}
                <button
                  onClick={minimizeChat}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="Minimize chat"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Reset Confirmation */}
            {showResetConfirm && (
              <div className="mt-2 p-2 bg-white bg-opacity-10 rounded-lg">
                <p className="text-xs text-primary-100 mb-2">Reset chat conversation? This will clear all messages.</p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleResetChat}
                    className="px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={cancelReset}
                    className="px-2 py-1 bg-transparent border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {session?.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "bg-primary-500 hover:bg-primary-600 text-white"
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
