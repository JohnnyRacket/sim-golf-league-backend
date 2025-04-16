import { Kysely } from 'kysely';
import { Database, NotificationType } from '../../types/database';
import { CreateNotificationBody, UpdateNotificationBody } from './notifications.types';
import { v4 as uuidv4 } from 'uuid';

export class NotificationsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string) {
    try {
      return await this.db.selectFrom('notifications')
        .select(['id', 'title', 'body', 'type', 'action_id', 'is_read', 'created_at', 'updated_at'])
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute();
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error}`);
    }
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.db.selectFrom('notifications')
        .select(eb => eb.fn.count('id').as('count'))
        .where('user_id', '=', userId)
        .where('is_read', '=', false)
        .executeTakeFirst();
      
      return result ? Number(result.count) : 0;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error}`);
    }
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string, userId: string) {
    try {
      return await this.db.selectFrom('notifications')
        .select(['id', 'title', 'body', 'type', 'action_id', 'is_read', 'created_at', 'updated_at'])
        .where('id', '=', id)
        .where('user_id', '=', userId) // Security: ensure user owns the notification
        .executeTakeFirst();
    } catch (error) {
      throw new Error(`Failed to get notification: ${error}`);
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationBody) {
    try {
      // Create properly typed insert object
      const insertData = {
        id: uuidv4(), // Generate a UUID for the notification
        user_id: data.user_id,
        title: data.title,
        body: data.body,
        type: data.type as NotificationType,
        is_read: false
      };
      
      // Add optional action_id if present
      if (data.action_id) {
        Object.assign(insertData, { action_id: data.action_id });
      }
      
      const result = await this.db.insertInto('notifications')
        .values(insertData)
        .returning(['id', 'title', 'body', 'type', 'action_id', 'is_read', 'created_at', 'updated_at'])
        .executeTakeFirst();
      
      return result;
    } catch (error) {
      throw new Error(`Failed to create notification: ${error}`);
    }
  }

  /**
   * Update notification (mark as read/unread)
   */
  async updateNotification(id: string, userId: string, data: UpdateNotificationBody) {
    try {
      const result = await this.db.updateTable('notifications')
        .set(data)
        .where('id', '=', id)
        .where('user_id', '=', userId) // Security: ensure user owns the notification
        .returning(['id', 'title', 'body', 'type', 'action_id', 'is_read', 'created_at', 'updated_at'])
        .executeTakeFirst();
      
      return result;
    } catch (error) {
      throw new Error(`Failed to update notification: ${error}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    try {
      await this.db.updateTable('notifications')
        .set({ is_read: true })
        .where('user_id', '=', userId)
        .where('is_read', '=', false)
        .execute();
      
      return true;
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error}`);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.deleteFrom('notifications')
        .where('id', '=', id)
        .where('user_id', '=', userId) // Security: ensure user owns the notification
        .executeTakeFirst();
      
      return !!result && result.numDeletedRows > BigInt(0);
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error}`);
    }
  }
} 