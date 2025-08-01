import { describe, test, expect } from '@jest/globals';
import messagingReducer, {
  setOnlineUsers,
  setSelectedMessages,
  toggleMessageSelection,
  clearSelectedMessages,
} from './messagingSlice';
import type { MessagingState } from './messagingSlice';

const initialState: MessagingState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},
  onlineUsers: [],
  searchQuery: '',
  selectedMessages: [],
  replyTo: null,
  editingMessage: null,
};

describe('messagingSlice', () => {
  test('should set online users as array', () => {
    const users = ['user1', 'user2', 'user3'];
    const action = setOnlineUsers(users);
    const newState = messagingReducer(initialState, action);
    
    expect(newState.onlineUsers).toEqual(users);
    expect(Array.isArray(newState.onlineUsers)).toBe(true);
  });

  test('should set selected messages as array', () => {
    const messages = ['msg1', 'msg2', 'msg3'];
    const action = setSelectedMessages(messages);
    const newState = messagingReducer(initialState, action);
    
    expect(newState.selectedMessages).toEqual(messages);
    expect(Array.isArray(newState.selectedMessages)).toBe(true);
  });

  test('should toggle message selection correctly', () => {
    // Add message to selection
    const addAction = toggleMessageSelection('msg1');
    let newState = messagingReducer(initialState, addAction);
    expect(newState.selectedMessages).toEqual(['msg1']);

    // Add another message
    const addAction2 = toggleMessageSelection('msg2');
    newState = messagingReducer(newState, addAction2);
    expect(newState.selectedMessages).toEqual(['msg1', 'msg2']);

    // Remove first message
    const removeAction = toggleMessageSelection('msg1');
    newState = messagingReducer(newState, removeAction);
    expect(newState.selectedMessages).toEqual(['msg2']);
  });

  test('should clear selected messages', () => {
    const stateWithSelection = {
      ...initialState,
      selectedMessages: ['msg1', 'msg2', 'msg3']
    };
    
    const action = clearSelectedMessages();
    const newState = messagingReducer(stateWithSelection, action);
    
    expect(newState.selectedMessages).toEqual([]);
  });

  test('should handle duplicate users in online users', () => {
    const usersWithDuplicates = ['user1', 'user2', 'user1', 'user3'];
    const action = setOnlineUsers(usersWithDuplicates);
    const newState = messagingReducer(initialState, action);
    
    // Redux allows duplicates in arrays, but we set exactly what was provided
    expect(newState.onlineUsers).toEqual(usersWithDuplicates);
  });
});
