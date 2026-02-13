import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db";
import { NotFoundError } from "../../utils/errors";
import { NotificationsService } from "./notifications.service";
import {
  PaginationQuery,
  parsePagination,
  buildPaginatedResult,
} from "../../utils/pagination";
import {
  notificationSchema,
  notificationListSchema,
  updateNotificationSchema,
  errorResponseSchema,
  successMessageSchema,
  notificationIdParamsSchema,
  UpdateNotificationBody,
} from "./notifications.types";

export async function notificationRoutes(fastify: FastifyInstance) {
  const notificationsService = new NotificationsService(db);

  // Get all notifications for current user (with optional pagination)
  fastify.get<{
    Querystring: PaginationQuery;
  }>(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
        response: {
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = request.user.id.toString();
      const notifications =
        await notificationsService.getUserNotifications(userId);

      if (request.query.page || request.query.limit) {
        const { page, limit, offset } = parsePagination(request.query);
        return buildPaginatedResult(
          notifications.slice(offset, offset + limit),
          notifications.length,
          page,
          limit,
        );
      }

      return notifications;
    },
  );

  // Get unread notifications count
  fastify.get(
    "/unread-count",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              count: { type: "number" },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id.toString();
      const count = await notificationsService.getUnreadCount(userId);
      return { count };
    },
  );

  // Get notification by ID
  fastify.get(
    "/:id",
    {
      schema: {
        params: notificationIdParamsSchema,
        response: {
          200: notificationSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const userId = request.user.id.toString();

      const notification = await notificationsService.getNotificationById(
        id,
        userId,
      );

      if (!notification) {
        throw new NotFoundError("Notification");
      }

      return notification;
    },
  );

  // Mark a notification as read/unread
  fastify.patch(
    "/:id",
    {
      schema: {
        params: notificationIdParamsSchema,
        body: updateNotificationSchema,
        response: {
          200: notificationSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateNotificationBody;
      }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const userId = request.user.id.toString();
      const updateData = request.body;

      const updated = await notificationsService.updateNotification(
        id,
        userId,
        updateData,
      );

      if (!updated) {
        throw new NotFoundError("Notification");
      }

      return updated;
    },
  );

  // Mark all notifications as read
  fastify.post(
    "/mark-all-read",
    {
      schema: {
        response: {
          200: successMessageSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id.toString();
      await notificationsService.markAllAsRead(userId);
      return { message: "All notifications marked as read" };
    },
  );

  // Delete a notification
  fastify.delete(
    "/:id",
    {
      schema: {
        params: notificationIdParamsSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const userId = request.user.id.toString();

      const deleted = await notificationsService.deleteNotification(id, userId);

      if (!deleted) {
        throw new NotFoundError("Notification");
      }

      return { message: "Notification deleted successfully" };
    },
  );
}
