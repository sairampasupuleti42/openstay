import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { socialService } from '@/modules/social/services/socialService';
import type { 
  Message, 
  Conversation, 
  MessageReaction, 
  ConversationParticipant,
  MessageAttachment 
} from '../types';

class MessagingService {
  // Configuration - temporarily disable mutual follow requirement for testing
  private requireMutualFollow = false; // Set to true to re-enable mutual follow requirement

  // Create a new conversation between users
  async createConversation(participants: string[]): Promise<string> {
    try {
      // Check if conversation already exists between these participants
      const existingConversation = await this.findExistingConversation(participants);
      if (existingConversation) {
        return existingConversation.id;
      }

      // Verify all participants follow each other (for direct messages)
      if (participants.length === 2 && this.requireMutualFollow) {
        const [user1, user2] = participants;
        console.log('Checking follow status for users:', user1, user2);
        
        const user1FollowsUser2 = await socialService.isFollowing(user1, user2);
        const user2FollowsUser1 = await socialService.isFollowing(user2, user1);
        
        console.log('Follow status:', {
          user1FollowsUser2,
          user2FollowsUser1,
          user1,
          user2
        });
        
        if (!user1FollowsUser2 || !user2FollowsUser1) {
          throw new Error(`Users must follow each other to start a conversation. Status: ${user1} follows ${user2}: ${user1FollowsUser2}, ${user2} follows ${user1}: ${user2FollowsUser1}`);
        }
      }

      const conversationData = {
        participants: participants.map(userId => ({
          userId,
          role: 'member',
          joinedAt: new Date(), // Use regular Date instead of serverTimestamp in arrays
        })),
        type: participants.length === 2 ? 'direct' : 'group',
        lastActivity: serverTimestamp(),
        unreadCount: 0,
        isTyping: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Find existing conversation between participants
  async findExistingConversation(participants: string[]): Promise<Conversation | null> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('type', '==', participants.length === 2 ? 'direct' : 'group')
      );

      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const conversationParticipants = data.participants.map((p: ConversationParticipant) => p.userId);
        
        if (this.arraysEqual(conversationParticipants.sort(), participants.sort())) {
          return {
            id: doc.id,
            ...data,
            lastActivity: data.lastActivity?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Conversation;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding existing conversation:', error);
      return null;
    }
  }

  // Send a message
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    replyTo?: string,
    attachments?: MessageAttachment[]
  ): Promise<string> {
    try {
      const messageData = {
        conversationId,
        senderId,
        content,
        type,
        timestamp: serverTimestamp(),
        edited: false,
        reactions: [],
        status: 'sent',
        ...(replyTo && { replyTo }),
        ...(attachments && { attachments }),
      };

      const messagesRef = collection(db, 'messages');
      const docRef = await addDoc(messagesRef, messageData);

      // Update conversation last activity and message
      await this.updateConversationLastMessage(conversationId, {
        id: docRef.id,
        ...messageData,
        timestamp: new Date(),
      } as Message);

      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get conversations for a user
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', { userId, role: 'member' }),
        orderBy('lastActivity', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const conversations: Conversation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          lastActivity: data.lastActivity?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation);
      });

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  // Get messages for a conversation
  async getConversationMessages(
    conversationId: string,
    limitCount: number = 50,
    lastDoc?: DocumentSnapshot
  ): Promise<{ messages: Message[]; lastDoc?: DocumentSnapshot }> {
    try {
      const messagesRef = collection(db, 'messages');
      let q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(
          messagesRef,
          where('conversationId', '==', conversationId),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      const messages: Message[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate(),
          reactions: data.reactions || [],
        } as Message);
      });

      const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      return {
        messages: messages.reverse(), // Reverse to show oldest first
        lastDoc: newLastDoc,
      };
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return { messages: [] };
    }
  }

  // Add reaction to message
  async addReaction(messageId: string, userId: string, userName: string, emoji: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const reactions = messageData.reactions || [];
      
      // Check if user already reacted with this emoji
      const existingReactionIndex = reactions.findIndex(
        (r: MessageReaction) => r.userId === userId && r.emoji === emoji
      );

      if (existingReactionIndex >= 0) {
        // Remove existing reaction
        reactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction
        reactions.push({
          id: `${messageId}_${userId}_${emoji}_${Date.now()}`,
          messageId,
          userId,
          userName,
          emoji,
          timestamp: new Date(),
        });
      }

      await updateDoc(messageRef, { reactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  // Remove reaction from message
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const reactions = messageData.reactions || [];
      
      const updatedReactions = reactions.filter(
        (r: MessageReaction) => !(r.userId === userId && r.emoji === emoji)
      );

      await updateDoc(messageRef, { reactions: updatedReactions });
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Update typing status
  async updateTypingStatus(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data();
      let typingUsers = conversationData.isTyping || [];

      if (isTyping) {
        if (!typingUsers.includes(userId)) {
          typingUsers.push(userId);
        }
      } else {
        typingUsers = typingUsers.filter((id: string) => id !== userId);
      }

      await updateDoc(conversationRef, { isTyping: typingUsers });
    } catch (error) {
      console.error('Error updating typing status:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data();
      const participants = conversationData.participants || [];
      
      const updatedParticipants = participants.map((p: ConversationParticipant) => {
        if (p.userId === userId) {
          return {
            ...p,
            lastReadAt: new Date(),
          };
        }
        return p;
      });

      await updateDoc(conversationRef, { 
        participants: updatedParticipants,
        [`unreadCount.${userId}`]: 0
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Subscribe to conversation messages
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const messages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate(),
          reactions: data.reactions || [],
        } as Message);
      });
      callback(messages);
    });
  }

  // Subscribe to user conversations
  subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', { userId, role: 'member' }),
      orderBy('lastActivity', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const conversations: Conversation[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          lastActivity: data.lastActivity?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation);
      });
      callback(conversations);
    });
  }

  // Configuration methods
  setRequireMutualFollow(require: boolean): void {
    this.requireMutualFollow = require;
  }

  getRequireMutualFollow(): boolean {
    return this.requireMutualFollow;
  }

  // Force check mutual follow status with fresh data
  async checkMutualFollow(user1: string, user2: string): Promise<{ user1FollowsUser2: boolean; user2FollowsUser1: boolean }> {
    try {
      const user1FollowsUser2 = await socialService.isFollowing(user1, user2);
      const user2FollowsUser1 = await socialService.isFollowing(user2, user1);
      
      console.log('Fresh follow status check:', {
        user1,
        user2,
        user1FollowsUser2,
        user2FollowsUser1
      });
      
      return { user1FollowsUser2, user2FollowsUser1 };
    } catch (error) {
      console.error('Error checking mutual follow status:', error);
      return { user1FollowsUser2: false, user2FollowsUser1: false };
    }
  }

  // Private helper methods
  private async updateConversationLastMessage(conversationId: string, message: Message): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          timestamp: message.timestamp,
          type: message.type,
        },
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating conversation last message:', error);
    }
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
}

export const messagingService = new MessagingService();
