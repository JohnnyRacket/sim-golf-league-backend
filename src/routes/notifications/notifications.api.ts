import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { NotificationsService } from './notifications.service';
import {
  notificationSchema,
  notificationListSchema,
  updateNotificationSchema,
  errorResponseSchema,
  successMessageSchema,
  notificationIdParamsSchema,
  UpdateNotificationBody
} from './notifications.types';

export async function notificationRoutes(fastify: FastifyInstance) {
  // Initialize service
  const notificationsService = new NotificationsService(db);

  // Get all notifications for current user
  fastify.get('/', {
    schema: {
      response: {
        200: notificationListSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      const notifications = await notificationsService.getUserNotifications(userId);
      return notifications;
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get unread notifications count
  fastify.get('/unread-count', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            count: { type: 'number' }
          }
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      const count = await notificationsService.getUnreadCount(userId);
      return { count };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get notification by ID
  fastify.get('/:id', {
    schema: {
      params: notificationIdParamsSchema,
      response: {
        200: notificationSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      
      const notification = await notificationsService.getNotificationById(id, userId);
      
      if (!notification) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      
      return notification;
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Mark a notification as read/unread
  fastify.patch('/:id', {
    schema: {
      params: notificationIdParamsSchema,
      body: updateNotificationSchema,
      response: {
        200: notificationSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateNotificationBody }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      const updateData = request.body;
      
      const updated = await notificationsService.updateNotification(id, userId, updateData);
      
      if (!updated) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      
      return updated;
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Mark all notifications as read
  fastify.post('/mark-all-read', {
    schema: {
      response: {
        200: successMessageSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      await notificationsService.markAllAsRead(userId);
      return { message: 'All notifications marked as read' };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a notification
  fastify.delete('/:id', {
    schema: {
      params: notificationIdParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      
      const deleted = await notificationsService.deleteNotification(id, userId);
      
      if (!deleted) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      
      return { message: 'Notification deleted successfully' };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 