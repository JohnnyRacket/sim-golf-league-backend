import { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../../db";
import { sql } from "kysely";
import {
  PaginationQuery,
  parsePagination,
  buildPaginatedResult,
} from "../../utils/pagination";

export async function publicLeagueRoutes(fastify: FastifyInstance) {
  // Browse public leagues
  fastify.get<{
    Querystring: {
      location_id?: string;
      status?: string;
      search?: string;
    } & PaginationQuery;
  }>(
    "/leagues",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            location_id: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["pending", "active", "completed"],
              default: "active",
            },
            search: { type: "string" },
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (request) => {
      const {
        location_id,
        status = "active",
        search,
        page,
        limit: queryLimit,
      } = request.query;

      let query = db
        .selectFrom("leagues")
        .leftJoin("locations", "locations.id", "leagues.location_id")
        .select([
          "leagues.id",
          "leagues.name",
          "leagues.description",
          "leagues.location_id",
          "leagues.start_date",
          "leagues.end_date",
          "leagues.status",
          "leagues.max_teams",
          "leagues.scheduling_format",
          "leagues.playoff_format",
          "locations.name as location_name",
        ])
        .where("leagues.is_public", "=", true)
        .where("leagues.status", "!=", "inactive");

      if (status) {
        query = query.where("leagues.status", "=", status as any);
      }

      if (location_id) {
        query = query.where("leagues.location_id", "=", location_id);
      }

      if (search) {
        query = query.where(
          sql`lower(leagues.name)`,
          "like",
          `%${search.toLowerCase()}%`,
        );
      }

      query = query.orderBy("leagues.start_date", "desc");

      const leagues = await query.execute();

      // Get team counts for each league
      const result = await Promise.all(
        leagues.map(async (league) => {
          const teamCount = await db
            .selectFrom("teams")
            .select(({ fn }) => fn.count<number>("id").as("count"))
            .where("league_id", "=", league.id)
            .where("status", "=", "active")
            .executeTakeFirst();

          return {
            ...league,
            current_team_count: Number(teamCount?.count ?? 0),
          };
        }),
      );

      if (page || queryLimit) {
        const { page: p, limit: l, offset } = parsePagination(request.query);
        return buildPaginatedResult(
          result.slice(offset, offset + l),
          result.length,
          p,
          l,
        );
      }

      return result;
    },
  );

  // Get public league detail
  fastify.get<{ Params: { id: string } }>(
    "/leagues/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const league = await db
        .selectFrom("leagues")
        .leftJoin("locations", "locations.id", "leagues.location_id")
        .select([
          "leagues.id",
          "leagues.name",
          "leagues.description",
          "leagues.location_id",
          "leagues.start_date",
          "leagues.end_date",
          "leagues.status",
          "leagues.max_teams",
          "leagues.scheduling_format",
          "leagues.playoff_format",
          "leagues.day_of_week",
          "leagues.start_time",
          "leagues.cost",
          "leagues.payment_type",
          "locations.name as location_name",
          "locations.address as location_address",
        ])
        .where("leagues.id", "=", id)
        .where("leagues.is_public", "=", true)
        .where("leagues.status", "!=", "inactive")
        .executeTakeFirst();

      if (!league) {
        reply.code(404).send({ error: "League not found" });
        return;
      }

      // Get teams (names only for public view)
      const teams = await db
        .selectFrom("teams")
        .select(["id", "name"])
        .where("league_id", "=", id)
        .where("status", "=", "active")
        .execute();

      // Get standings
      const standings = await db
        .selectFrom("stats")
        .innerJoin("teams", "teams.id", "stats.team_id")
        .select([
          "stats.team_id",
          "teams.name as team_name",
          "stats.matches_played",
          "stats.matches_won as wins",
          "stats.matches_lost as losses",
          "stats.matches_drawn as draws",
        ])
        .where("stats.league_id", "=", id)
        .where("teams.status", "=", "active")
        .execute();

      const rankedStandings = standings
        .map((row) => ({
          ...row,
          points: row.wins * 3 + row.draws,
        }))
        .sort((a, b) => b.points - a.points);

      // Get upcoming matches
      const schedule = await db
        .selectFrom("matches")
        .leftJoin(
          "teams as home_team",
          "home_team.id",
          "matches.home_team_id",
        )
        .leftJoin(
          "teams as away_team",
          "away_team.id",
          "matches.away_team_id",
        )
        .select([
          "matches.id",
          "matches.match_date",
          "matches.status",
          "matches.home_team_score",
          "matches.away_team_score",
          "home_team.name as home_team_name",
          "away_team.name as away_team_name",
        ])
        .where("matches.league_id", "=", id)
        .orderBy("matches.match_date", "desc")
        .limit(20)
        .execute();

      return {
        ...league,
        teams,
        standings: rankedStandings,
        schedule,
      };
    },
  );

  // Browse locations (public)
  fastify.get(
    "/locations",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: PaginationQuery }>,
    ) => {
      const locations = await db
        .selectFrom("locations")
        .select(["id", "name", "address"])
        .orderBy("name")
        .execute();

      const { page, limit: queryLimit } = request.query;

      if (page || queryLimit) {
        const { page: p, limit: l, offset } = parsePagination(request.query);
        return buildPaginatedResult(
          locations.slice(offset, offset + l),
          locations.length,
          p,
          l,
        );
      }

      return locations;
    },
  );
}
