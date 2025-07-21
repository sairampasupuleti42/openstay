import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Notification {
  id: string;
  userId: string; // Recipient of the notification
  fromUserId: string; // Who triggered the notification
  type: 'follow' | 'interest' | 'review' | 'message' | 'stay_request' | 'stay_approved' | 'stay_declined';
  title: string;
  message: string;
  data?: {
    stayId?: string;
    reviewId?: string;
    messageId?: string;
    userName?: string;
    userPhotoURL?: string;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  fromUserId: string;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Notification['data'];
}

class NotificationService {
  private collectionName = 'notifications';

  // Create a new notification
  async createNotification(notificationData: CreateNotificationData): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...notificationData,
        read: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  async getUserNotifications(
    userId: string, 
    limitCount: number = 20,
    readStatus?: boolean
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (readStatus !== undefined) {
        q = query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          where('read', '==', readStatus),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      const notifications: Notification[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Notification);
      });

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, {
          read: true,
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: Notification[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications: Notification[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Notification);
      });

      callback(notifications);
    });
  }

  // Helper methods for specific notification types
  async notifyUserFollowed(followedUserId: string, followerUserId: string, followerName: string): Promise<void> {
    await this.createNotification({
      userId: followedUserId,
      fromUserId: followerUserId,
      type: 'follow',
      title: 'New Follower',
      message: `${followerName} started following you`,
      data: { userName: followerName }
    });
  }

  async notifyStayInterest(hostUserId: string, guestUserId: string, guestName: string, stayId: string): Promise<void> {
    await this.createNotification({
      userId: hostUserId,
      fromUserId: guestUserId,
      type: 'interest',
      title: 'Stay Interest',
      message: `${guestName} is interested in your stay`,
      data: { userName: guestName, stayId }
    });
  }

  async notifyNewReview(revieweeUserId: string, reviewerUserId: string, reviewerName: string, reviewId: string): Promise<void> {
    await this.createNotification({
      userId: revieweeUserId,
      fromUserId: reviewerUserId,
      type: 'review',
      title: 'New Review',
      message: `${reviewerName} left you a review`,
      data: { userName: reviewerName, reviewId }
    });
  }

  async notifyNewMessage(recipientUserId: string, senderUserId: string, senderName: string, messageId: string): Promise<void> {
    await this.createNotification({
      userId: recipientUserId,
      fromUserId: senderUserId,
      type: 'message',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      data: { userName: senderName, messageId }
    });
  }
}

export const notificationService = new NotificationService();
