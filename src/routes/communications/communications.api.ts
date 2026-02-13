import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { checkRole } from "../../middleware/auth";
import {
  PaginationQuery,
  parsePagination,
  buildPaginatedResult,
} from "../../utils/pagination";
import {
  createCommunication,
  getCommunications,
  getCommunicationById,
  deleteCommunication,
  getCommunicationsForLeague,
} from "./communications.service";
import {
  communicationSchema,
  communicationListSchema,
  createCommunicationSchema,
  communicationIdParamsSchema,
  leagueIdParamsSchema,
  errorResponseSchema,
  successResponseSchema,
  CreateCommunicationBody,
} from "./communications.types";

export async function communicationRoutes(fastify: FastifyInstance) {
  // Get all communications
  fastify.get<{ Querystring: PaginationQuery }>(
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
      const communications = await getCommunications();

      if (request.query.page || request.query.limit) {
        const { page, limit, offset } = parsePagination(request.query);
        return buildPaginatedResult(
          communications.slice(offset, offset + limit),
          communications.length,
          page,
          limit,
        );
      }

      return communications;
    },
  );

  // Get communication by ID
  fastify.get(
    "/:id",
    {
      schema: {
        params: communicationIdParamsSchema,
        response: {
          200: communicationSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const { id } = request.params;
      return getCommunicationById(id);
    },
  );

  // Get all communications for a specific league
  fastify.get(
    "/league/:leagueId",
    {
      schema: {
        params: leagueIdParamsSchema,
        response: {
          200: communicationListSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { leagueId: string } }>) => {
      const { leagueId } = request.params;
      return getCommunicationsForLeague(leagueId);
    },
  );

  // Create a new communication (managers/admins only)
  fastify.post<{ Body: CreateCommunicationBody }>(
    "/",
    {
      preHandler: checkRole(["manager"]),
      schema: {
        body: createCommunicationSchema,
        response: {
          200: communicationSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const {
        recipientType,
        recipientId,
        type,
        title,
        message,
        expirationDate,
        senderId,
      } = request.body;

      const actualSenderId =
        senderId === null ? null : senderId || request.user.id.toString();

      return createCommunication({
        recipientType: recipientType as "league" | "team" | "user",
        recipientId,
        type: type as
          | "system"
          | "league"
          | "maintenance"
          | "advertisement"
          | "schedule",
        title,
        message,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        senderId: actualSenderId,
      });
    },
  );

  // Delete communication (managers/admins only)
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: checkRole(["manager"]),
      schema: {
        params: communicationIdParamsSchema,
        response: {
          200: successResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      return deleteCommunication(id);
    },
  );
}
