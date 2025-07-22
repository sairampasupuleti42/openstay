import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messagingService } from '../services/messagingService';
import { socialService } from '@/modules/social/services/socialService';
import ConversationList from '../components/ConversationList';
import ChatInterface from '../components/ChatInterface';
import UserCard from '@/modules/social/components/UserCard';
import type { Conversation } from '../types';
import type { UserProfile } from '@/services/userServiceEnhanced';

const MessagingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStartChat = useCallback(async (userId: string) => {
    if (!currentUser) return;

    try {
      const conversationId = await messagingService.createConversation([currentUser.uid, userId]);
      setActiveConversationId(conversationId);
      setShowNewChat(false);
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Unable to start chat. Make sure you both follow each other.');
    }
  }, [currentUser]);

  // Handle startChat query parameter
  useEffect(() => {
    const startChatUserId = searchParams.get('startChat');
    if (startChatUserId && currentUser) {
      handleStartChat(startChatUserId);
      // Clear the query parameter
      window.history.replaceState({}, '', '/messages');
    }
  }, [searchParams, currentUser, handleStartChat]);

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe: (() => void) | undefined;

    const loadConversations = async () => {
      try {
        unsubscribe = messagingService.subscribeToConversations(
          currentUser.uid,
          (newConversations) => {
            setConversations(newConversations);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error loading conversations:', error);
        setLoading(false);
      }
    };

    loadConversations();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Load following users when showing new chat
  useEffect(() => {
    const loadFollowingUsers = async () => {
      if (!currentUser) return;

      setLoadingFollowing(true);
      try {
        const following = await socialService.getUserFollowing(currentUser.uid);
        setFollowingUsers(following);
      } catch (error) {
        console.error('Error loading following users:', error);
      } finally {
        setLoadingFollowing(false);
      }
    };

    if (showNewChat && currentUser) {
      loadFollowingUsers();
    }
  }, [showNewChat, currentUser]);

  const handleNewConversation = () => {
    setShowNewChat(true);
    if (isMobile) {
      setActiveConversationId(null);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (isMobile) {
      setShowNewChat(false);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredFollowing = followingUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to chat</h2>
          <p className="text-gray-600">You need to be signed in to access messaging</p>
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    if (showNewChat) {
      return (
        <div className="flex flex-col h-screen bg-white">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">New Chat</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewChat(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <Input
              type="text"
              placeholder="Search people you follow..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Following users list */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingFollowing ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : filteredFollowing.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No users found</p>
                <p className="text-sm text-gray-400">You can only message people you follow</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFollowing.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => handleStartChat(user.uid)}
                    className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium overflow-hidden mr-3">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{user.displayName}</h4>
                      {user.location && (
                        <p className="text-sm text-gray-500">{user.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeConversation) {
      return (
        <ChatInterface
          conversation={activeConversation}
          currentUserId={currentUser.uid}
          onClose={() => setActiveConversationId(null)}
          isMobile={true}
        />
      );
    }

    return (
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        currentUserId={currentUser.uid}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        loading={loading}
      />
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen bg-gray-50">
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        currentUserId={currentUser.uid}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        loading={loading}
      />

      {/* Main content area */}
      <div className="flex-1 flex">
        {showNewChat ? (
          <div className="flex-1 bg-white">
            {/* New chat header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">New Chat</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewChat(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <Input
                type="text"
                placeholder="Search people you follow..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Following users grid */}
            <div className="p-6 overflow-y-auto">
              {loadingFollowing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading people you follow...</p>
                </div>
              ) : filteredFollowing.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500">You can only message people you follow</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFollowing.map((user) => (
                    <div key={user.uid} className="cursor-pointer" onClick={() => handleStartChat(user.uid)}>
                      <UserCard
                        user={user}
                        currentUserId={currentUser.uid}
                        variant="grid"
                        showActions={false}
                        onMessage={() => handleStartChat(user.uid)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeConversation ? (
          <ChatInterface
            conversation={activeConversation}
            currentUserId={currentUser.uid}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h2>
              <p className="text-gray-600 mb-4">Choose a conversation from the list or start a new one</p>
              <Button onClick={handleNewConversation}>
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPage;
