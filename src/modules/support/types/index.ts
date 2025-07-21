export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'quick_action' | 'link';
}

export interface QuickAction {
  id: string;
  label: string;
  response: string;
  category: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  isActive: boolean;
  startedAt: Date;
  lastActivity: Date;
}

export interface KnowledgeBaseItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  priority: number;
}

export interface ChatbotState {
  isOpen: boolean;
  isTyping: boolean;
  currentSession: ChatSession | null;
  unreadCount: number;
}
