import { FastifyInstance } from "fastify";
import { db } from "../../db";
import { checkLocationRole } from "../../middleware/auth";
import { SeasonsService } from "./seasons.service";
import {
  createSeasonSchema,
  updateSeasonSchema,
  seasonSchema,
  seasonDetailSchema,
  locationIdParamsSchema,
  seasonIdParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  CreateSeasonBody,
  UpdateSeasonBody,
} from "./seasons.types";

export async function seasonRoutes(fastify: FastifyInstance) {
  const seasonsService = new SeasonsService(db);

  // Get all seasons for a location
  fastify.get<{ Params: { locationId: string } }>(
    "/location/:locationId",
    {
      schema: {
        params: locationIdParamsSchema,
        response: {
          200: { type: "array", items: seasonSchema },
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return seasonsService.getSeasonsByLocation(request.params.locationId);
    },
  );

  // Get season by ID with leagues
  fastify.get<{ Params: { seasonId: string } }>(
    "/:seasonId",
    {
      schema: {
        params: seasonIdParamsSchema,
        response: {
          200: seasonDetailSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return seasonsService.getSeasonById(request.params.seasonId);
    },
  );

  // Create a new season (location owner only)
  fastify.post<{ Body: CreateSeasonBody }>(
    "/",
    {
      schema: {
        body: createSeasonSchema,
        response: {
          201: successMessageSchema,
          400: errorResponseSchema,
          403: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { location_id, name, description, start_date, end_date } =
        request.body;

      // Check user owns the location
      const isOwner = request.user.locations?.[location_id] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply
          .code(403)
          .send({
            error: "Not authorized to create seasons for this location",
          });
        return;
      }

      const result = await seasonsService.createSeason({
        locationId: location_id,
        name,
        description,
        startDate: start_date,
        endDate: end_date,
      });

      reply.code(201).send({ message: `Season created`, ...result });
    },
  );

  // Update a season (location owner only)
  fastify.put<{ Params: { seasonId: string }; Body: UpdateSeasonBody }>(
    "/:seasonId",
    {
      schema: {
        params: seasonIdParamsSchema,
        body: updateSeasonSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seasonsService.getSeasonLocationId(
        request.params.seasonId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Season not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to update this season" });
        return;
      }

      await seasonsService.updateSeason(request.params.seasonId, request.body);
      reply.send({ message: "Season updated" });
    },
  );

  // Delete a season (location owner only)
  fastify.delete<{ Params: { seasonId: string } }>(
    "/:seasonId",
    {
      schema: {
        params: seasonIdParamsSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seasonsService.getSeasonLocationId(
        request.params.seasonId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Season not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to delete this season" });
        return;
      }

      await seasonsService.deleteSeason(request.params.seasonId);
      reply.send({ message: "Season deleted" });
    },
  );

  // Assign a league to a season
  fastify.post<{ Params: { seasonId: string }; Body: { league_id: string } }>(
    "/:seasonId/leagues",
    {
      schema: {
        params: seasonIdParamsSchema,
        body: {
          type: "object",
          properties: { league_id: { type: "string", format: "uuid" } },
          required: ["league_id"],
        },
        response: {
          200: successMessageSchema,
          400: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seasonsService.getSeasonLocationId(
        request.params.seasonId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Season not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to manage this season" });
        return;
      }

      await seasonsService.assignLeagueToSeason(
        request.body.league_id,
        request.params.seasonId,
      );
      reply.send({ message: "League assigned to season" });
    },
  );

  // Remove a league from a season
  fastify.delete<{ Params: { seasonId: string; leagueId: string } }>(
    "/:seasonId/leagues/:leagueId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            seasonId: { type: "string", format: "uuid" },
            leagueId: { type: "string", format: "uuid" },
          },
          required: ["seasonId", "leagueId"],
        },
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seasonsService.getSeasonLocationId(
        request.params.seasonId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Season not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to manage this season" });
        return;
      }

      await seasonsService.removeLeagueFromSeason(request.params.leagueId);
      reply.send({ message: "League removed from season" });
    },
  );
}
