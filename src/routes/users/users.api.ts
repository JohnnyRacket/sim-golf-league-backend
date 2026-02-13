import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db";
import { checkRole } from "../../middleware/auth";
import { NotFoundError } from "../../utils/errors";
import {
  PaginationQuery,
  parsePagination,
  buildPaginatedResult,
} from "../../utils/pagination";
import { UsersService } from "./users.service";
import {
  userProfileSchema,
  updateUserSchema,
  userDashboardSchema,
  UpdateUserBody,
  userListSchema,
  userBasicSchema,
  userIdParamsSchema,
  errorResponseSchema,
  successMessageSchema,
} from "./users.types";

export async function userRoutes(fastify: FastifyInstance) {
  // Initialize service
  const usersService = new UsersService(db);

  // Get all users (admin/owner only)
  fastify.get<{ Querystring: PaginationQuery }>(
    "/",
    {
      preHandler: checkRole(["owner"]),
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
      const users = await usersService.getAllUsers();

      if (request.query.page || request.query.limit) {
        const { page, limit, offset } = parsePagination(request.query);
        return buildPaginatedResult(
          users.slice(offset, offset + limit),
          users.length,
          page,
          limit,
        );
      }

      return users;
    },
  );

  // Get current user profile (self)
  fastify.get(
    "/me",
    {
      schema: {
        response: {
          200: userProfileSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id.toString();

      const profile = await usersService.getCurrentUserProfile(userId);

      if (!profile) {
        throw new NotFoundError("User");
      }

      return profile;
    },
  );

  // Get user dashboard data
  fastify.get(
    "/me/dashboard",
    {
      schema: {
        response: {
          200: userDashboardSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id.toString();
      return usersService.getUserDashboard(userId);
    },
  );

  // Get user by ID (admin/owner or self only)
  fastify.get(
    "/:id",
    {
      schema: {
        params: userIdParamsSchema,
        response: {
          200: userBasicSchema,
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

      // Check if user is requesting their own data or is an owner
      if (
        request.user.id.toString() !== id &&
        !(
          request.user.platform_role === "admin" ||
          Object.keys(request.user.locations || {}).length > 0
        )
      ) {
        reply.code(403).send({ error: "Forbidden" });
        return;
      }

      const user = await usersService.getUserById(id);

      if (!user) {
        throw new NotFoundError("User");
      }

      return user;
    },
  );

  // Update user (self only)
  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>(
    "/:id",
    {
      schema: {
        params: userIdParamsSchema,
        body: updateUserSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Users can only update their own data
      if (request.user.id.toString() !== id) {
        reply.code(403).send({ error: "Forbidden" });
        return;
      }

      const updateData = request.body;
      const updated = await usersService.updateUser(id, updateData);

      if (!updated) {
        throw new NotFoundError("User");
      }

      return { message: "User updated successfully" };
    },
  );
}
