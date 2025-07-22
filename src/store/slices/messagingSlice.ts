import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Conversation, Message } from '@/modules/messaging/types';

// Types
export interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  isLoading: boolean;
  error: string | null;
  // Real-time states
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  onlineUsers: Set<string>;
  // UI states
  searchQuery: string;
  selectedMessages: Set<string>;
  replyTo: Message | null;
  editingMessage: Message | null;
}

// Initial state
const initialState: MessagingState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},
  onlineUsers: new Set(),
  searchQuery: '',
  selectedMessages: new Set(),
  replyTo: null,
  editingMessage: null,
};

// Messaging slice
const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const existingIndex = state.conversations.findIndex(c => c.id === action.payload.id);
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversation: (state, action: PayloadAction<{ id: string; updates: Partial<Conversation> }>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index >= 0) {
        state.conversations[index] = { ...state.conversations[index], ...action.payload.updates };
      }
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    updateMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string; updates: Partial<Message> }>) => {
      const { conversationId, messageId, updates } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index >= 0) {
          messages[index] = { ...messages[index], ...updates };
        }
      }
    },
    deleteMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      const { conversationId, messageId } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        state.messages[conversationId] = messages.filter(m => m.id !== messageId);
      }
    },
    setTypingUsers: (state, action: PayloadAction<{ conversationId: string; userIds: string[] }>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.userIds;
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = new Set(action.payload);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedMessages: (state, action: PayloadAction<string[]>) => {
      state.selectedMessages = new Set(action.payload);
    },
    toggleMessageSelection: (state, action: PayloadAction<string>) => {
      if (state.selectedMessages.has(action.payload)) {
        state.selectedMessages.delete(action.payload);
      } else {
        state.selectedMessages.add(action.payload);
      }
    },
    clearSelectedMessages: (state) => {
      state.selectedMessages.clear();
    },
    setReplyTo: (state, action: PayloadAction<Message | null>) => {
      state.replyTo = action.payload;
    },
    setEditingMessage: (state, action: PayloadAction<Message | null>) => {
      state.editingMessage = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMessaging: (state) => {
      state.conversations = [];
      state.activeConversationId = null;
      state.messages = {};
      state.typingUsers = {};
      state.onlineUsers.clear();
      state.searchQuery = '';
      state.selectedMessages.clear();
      state.replyTo = null;
      state.editingMessage = null;
      state.error = null;
    },
  },
});

// Export actions
export const {
  setConversations,
  addConversation,
  updateConversation,
  setActiveConversation,
  setMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  setTypingUsers,
  setOnlineUsers,
  setSearchQuery,
  setSelectedMessages,
  toggleMessageSelection,
  clearSelectedMessages,
  setReplyTo,
  setEditingMessage,
  setLoading,
  setError,
  clearError,
  clearMessaging,
} = messagingSlice.actions;

// Selectors
export const selectMessaging = (state: { messaging: MessagingState }) => state.messaging;
export const selectConversations = (state: { messaging: MessagingState }) => state.messaging.conversations;
export const selectActiveConversationId = (state: { messaging: MessagingState }) => state.messaging.activeConversationId;
export const selectActiveConversation = (state: { messaging: MessagingState }) => {
  const { conversations, activeConversationId } = state.messaging;
  return conversations.find(c => c.id === activeConversationId) || null;
};
export const selectMessages = (state: { messaging: MessagingState }, conversationId: string) => 
  state.messaging.messages[conversationId] || [];
export const selectMessagingLoading = (state: { messaging: MessagingState }) => state.messaging.isLoading;
export const selectMessagingError = (state: { messaging: MessagingState }) => state.messaging.error;
export const selectTypingUsers = (state: { messaging: MessagingState }, conversationId: string) =>
  state.messaging.typingUsers[conversationId] || [];
export const selectOnlineUsers = (state: { messaging: MessagingState }) => state.messaging.onlineUsers;
export const selectSearchQuery = (state: { messaging: MessagingState }) => state.messaging.searchQuery;
export const selectSelectedMessages = (state: { messaging: MessagingState }) => state.messaging.selectedMessages;
export const selectReplyTo = (state: { messaging: MessagingState }) => state.messaging.replyTo;
export const selectEditingMessage = (state: { messaging: MessagingState }) => state.messaging.editingMessage;

export default messagingSlice.reducer;
