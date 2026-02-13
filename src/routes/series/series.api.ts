import { FastifyInstance } from "fastify";
import { db } from "../../db";
import { SeriesService } from "./series.service";
import {
  createSeriesSchema,
  createSeriesFromLeagueSchema,
  updateSeriesSchema,
  seriesSchema,
  seriesDetailSchema,
  locationIdParamsSchema,
  seriesIdParamsSchema,
  leagueIdParamsSchema,
  seriesLeagueParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  CreateSeriesBody,
  CreateSeriesFromLeagueBody,
  UpdateSeriesBody,
} from "./series.types";

export async function seriesRoutes(fastify: FastifyInstance) {
  const seriesService = new SeriesService(db);

  // Get all series for a location
  fastify.get<{ Params: { locationId: string } }>(
    "/location/:locationId",
    {
      schema: {
        params: locationIdParamsSchema,
        response: {
          200: { type: "array", items: seriesSchema },
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return seriesService.getSeriesByLocation(request.params.locationId);
    },
  );

  // Get series by ID with leagues
  fastify.get<{ Params: { seriesId: string } }>(
    "/:seriesId",
    {
      schema: {
        params: seriesIdParamsSchema,
        response: {
          200: seriesDetailSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return seriesService.getSeriesById(request.params.seriesId);
    },
  );

  // Create a new series
  fastify.post<{ Body: CreateSeriesBody }>(
    "/",
    {
      schema: {
        body: createSeriesSchema,
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
        reply.code(403).send({
          error: "Not authorized to create series for this location",
        });
        return;
      }

      const result = await seriesService.createSeries({
        locationId: location_id,
        name,
        description,
        startDate: start_date,
        endDate: end_date,
      });

      reply.code(201).send({ message: "Series created", ...result });
    },
  );

  // Create a series from an existing league (retroactive flow)
  fastify.post<{
    Params: { leagueId: string };
    Body: CreateSeriesFromLeagueBody;
  }>(
    "/from-league/:leagueId",
    {
      schema: {
        params: leagueIdParamsSchema,
        body: createSeriesFromLeagueSchema,
        response: {
          201: successMessageSchema,
          400: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { leagueId } = request.params;
      const { name, description, start_date, end_date } = request.body;

      // Look up the league to find its location for auth check
      const league = await db
        .selectFrom("leagues")
        .select(["location_id"])
        .where("id", "=", leagueId)
        .where("status", "!=", "inactive")
        .executeTakeFirst();

      if (!league) {
        reply.code(404).send({ error: "League not found" });
        return;
      }

      const isOwner = request.user.locations?.[league.location_id] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({
          error: "Not authorized to create series for this location",
        });
        return;
      }

      const result = await seriesService.createSeriesFromLeague(leagueId, {
        name,
        description,
        startDate: start_date,
        endDate: end_date,
      });

      reply
        .code(201)
        .send({ message: "Series created from league", ...result });
    },
  );

  // Update a series
  fastify.put<{ Params: { seriesId: string }; Body: UpdateSeriesBody }>(
    "/:seriesId",
    {
      schema: {
        params: seriesIdParamsSchema,
        body: updateSeriesSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seriesService.getSeriesLocationId(
        request.params.seriesId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Series not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to update this series" });
        return;
      }

      await seriesService.updateSeries(request.params.seriesId, request.body);
      reply.send({ message: "Series updated" });
    },
  );

  // Delete a series
  fastify.delete<{ Params: { seriesId: string } }>(
    "/:seriesId",
    {
      schema: {
        params: seriesIdParamsSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seriesService.getSeriesLocationId(
        request.params.seriesId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Series not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to delete this series" });
        return;
      }

      await seriesService.deleteSeries(request.params.seriesId);
      reply.send({ message: "Series deleted" });
    },
  );

  // Assign a league to a series
  fastify.post<{ Params: { seriesId: string }; Body: { league_id: string } }>(
    "/:seriesId/leagues",
    {
      schema: {
        params: seriesIdParamsSchema,
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
      const locationId = await seriesService.getSeriesLocationId(
        request.params.seriesId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Series not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to manage this series" });
        return;
      }

      await seriesService.assignLeagueToSeries(
        request.body.league_id,
        request.params.seriesId,
      );
      reply.send({ message: "League assigned to series" });
    },
  );

  // Remove a league from a series
  fastify.delete<{ Params: { seriesId: string; leagueId: string } }>(
    "/:seriesId/leagues/:leagueId",
    {
      schema: {
        params: seriesLeagueParamsSchema,
        response: {
          200: successMessageSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const locationId = await seriesService.getSeriesLocationId(
        request.params.seriesId,
      );
      if (!locationId) {
        reply.code(404).send({ error: "Series not found" });
        return;
      }

      const isOwner = request.user.locations?.[locationId] === "owner";
      const isAdmin = request.user.platform_role === "admin";

      if (!isOwner && !isAdmin) {
        reply.code(403).send({ error: "Not authorized to manage this series" });
        return;
      }

      await seriesService.removeLeagueFromSeries(request.params.leagueId);
      reply.send({ message: "League removed from series" });
    },
  );
}
