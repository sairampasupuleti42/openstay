export { default as MessagingPage } from './pages/MessagingPage';
export { default as ChatInterface } from './components/ChatInterface';
export { default as ConversationList } from './components/ConversationList';
export { MessageBubble, MessageInput } from './components/MessageBubble';
export { messagingService } from './services/messagingService';
export type {
  Message,
  Conversation,
  MessageReaction,
  ConversationParticipant,
  TypingIndicator,
  MessageDraft,
  ChatState,
  EmojiReaction,
  MessageAttachment
} from './types';
