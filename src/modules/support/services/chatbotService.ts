import type { ChatMessage, ChatSession } from '../types';
import { quickActions, searchKeywords } from './knowledgeBase';

class ChatbotService {
  private sessions: Map<string, ChatSession> = new Map();

  // Generate a simple response based on user input
  generateResponse(userMessage: string): string {
    const query = userMessage.toLowerCase().trim();
    
    // Handle greetings
    if (this.isGreeting(query)) {
      return "Hello! 👋 Welcome to OpenStay support. I'm here to help you with questions about our community-driven travel platform. How can I assist you today?";
    }
    
    // Handle thanks
    if (this.isThanking(query)) {
      return "You're welcome! 😊 Is there anything else I can help you with regarding OpenStay?";
    }
    
    // Handle goodbye
    if (this.isGoodbye(query)) {
      return "Thanks for chatting with OpenStay support! Have a wonderful day and happy travels! 🌍✈️";
    }
    
    // Search knowledge base
    const matchedItems = searchKeywords(query);
    
    if (matchedItems.length > 0) {
      const bestMatch = matchedItems[0];
      let response = bestMatch.answer;
      
      // Add related suggestions if multiple matches
      if (matchedItems.length > 1) {
        response += "\n\n📚 Related topics you might find helpful:";
        matchedItems.slice(1).forEach((item, index) => {
          response += `\n${index + 2}. ${item.question}`;
        });
      }
      
      return response;
    }
    
    // Handle specific platform questions
    if (query.includes('host') && query.includes('group')) {
      return "Great question about group hosting! OpenStay specializes in connecting groups (2-10 people) with welcoming hosts. This makes us perfect for student groups, digital nomad teams, and friends traveling together. Would you like to know more about becoming a group host or finding hosts for your group?";
    }
    
    if (query.includes('safety') || query.includes('secure') || query.includes('trust')) {
      return "Safety is our top priority at OpenStay! 🛡️ We provide ID verification, background checks, host certification, SOS check-ins, and optional Safety Shield insurance. Our community review system also helps you connect with trusted members. What specific safety feature would you like to know more about?";
    }
    
    if (query.includes('cultural') || query.includes('experience') || query.includes('local')) {
      return "OpenStay is all about authentic cultural experiences! 🎭 Our hosts offer cooking classes, traditional crafts, local tours, language exchange, and spiritual experiences. You can search for hosts by their cultural badges and activity offerings. Ready to dive into local culture?";
    }
    
    if (query.includes('price') || query.includes('cost') || query.includes('free')) {
      return "OpenStay uses a freemium model! 💰 Core hosting and traveling features are completely free. We offer premium subscriptions for verified-only access and early booking privileges. Hosts can choose to offer free stays or charge for special cultural experiences. Would you like details about our pricing structure?";
    }
    
    // Default response with quick actions
    return "I'd be happy to help you with that! While I search for the best answer, here are some popular topics I can assist with:\n\n🚀 Getting started with OpenStay\n🏠 Finding hosts or becoming one\n👥 Group travel and hosting\n🛡️ Safety and verification\n🎭 Cultural experiences\n💰 Pricing information\n\nFeel free to ask about any of these topics, or type your specific question!";
  }
  
  // Create a new chat session
  createSession(): ChatSession {
    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      messages: [
        {
          id: '1',
          content: "Hi there! 👋 Welcome to OpenStay support. I'm your AI assistant, here to help you learn about our community-driven travel platform where you can host travelers or find authentic local experiences. What would you like to know?",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        }
      ],
      isActive: true,
      startedAt: new Date(),
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  // Add a message to session
  addMessage(sessionId: string, content: string, sender: 'user' | 'bot'): ChatMessage {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      type: 'text'
    };
    
    session.messages.push(message);
    session.lastActivity = new Date();
    
    return message;
  }
  
  // Get session by ID
  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  // Reset session (clear messages but keep session)
  resetSession(sessionId: string): ChatSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Clear all messages and add welcome message
    session.messages = [
      {
        id: '1',
        content: "Hi there! 👋 Welcome back to OpenStay support. I'm your AI assistant, here to help you learn about our community-driven travel platform. What would you like to know?",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      }
    ];
    session.lastActivity = new Date();
    
    return session;
  }
  
  // Get quick actions
  getQuickActions() {
    return quickActions;
  }
  
  // Process user message and generate bot response
  async processMessage(sessionId: string, userMessage: string): Promise<ChatMessage> {
    // Add user message
    this.addMessage(sessionId, userMessage, 'user');
    
    // Generate and add bot response
    const botResponse = this.generateResponse(userMessage);
    return this.addMessage(sessionId, botResponse, 'bot');
  }
  
  // Helper methods
  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'help'];
    return greetings.some(greeting => message.includes(greeting));
  }
  
  private isThanking(message: string): boolean {
    const thanks = ['thank', 'thanks', 'appreciate', 'helpful'];
    return thanks.some(thank => message.includes(thank));
  }
  
  private isGoodbye(message: string): boolean {
    const goodbyes = ['bye', 'goodbye', 'see you', 'farewell', 'exit', 'quit', 'close'];
    return goodbyes.some(goodbye => message.includes(goodbye));
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const chatbotService = new ChatbotService();
