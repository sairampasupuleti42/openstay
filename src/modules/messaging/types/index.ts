export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  reactions: MessageReaction[];
  replyTo?: string; // Reply to another message
  attachments?: MessageAttachment[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  type: 'direct' | 'group';
  name?: string; // For group chats
  avatar?: string; // For group chats
  lastMessage?: Message;
  lastActivity: Date;
  unreadCount: number;
  isTyping: string[]; // User IDs who are typing
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  userId: string;
  userName: string;
  userPhoto?: string;
  role: 'member' | 'admin';
  joinedAt: Date;
  lastReadMessageId?: string;
  lastReadAt?: Date;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface MessageDraft {
  conversationId: string;
  content: string;
  timestamp: Date;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  typingUsers: Record<string, TypingIndicator[]>;
  drafts: Record<string, MessageDraft>;
}

export const EMOJI_REACTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🔥', '💯'
] as const;

export type EmojiReaction = typeof EMOJI_REACTIONS[number];
