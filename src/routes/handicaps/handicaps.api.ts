import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { checkLeagueRole } from '../../middleware/auth';
import { HandicapsService } from './handicaps.service';
import {
  setHandicapSchema,
  setTeamHandicapSchema,
  playerHandicapSchema,
  handicapHistorySchema,
  teamHandicapSchema,
  leagueIdParamsSchema,
  leagueUserIdParamsSchema,
  teamIdParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  SetHandicapBody,
  SetTeamHandicapBody,
} from './handicaps.types';

export async function handicapRoutes(fastify: FastifyInstance) {
  const handicapsService = new HandicapsService(db);

  // Get all player handicaps for a league
  fastify.get<{ Params: { leagueId: string } }>('/leagues/:leagueId', {
    schema: {
      params: leagueIdParamsSchema,
      response: {
        200: { type: 'array', items: playerHandicapSchema },
        500: errorResponseSchema,
      },
    },
  }, async (request) => {
    return handicapsService.getLeagueHandicaps(request.params.leagueId);
  });

  // Set/update a player's handicap (manager or self)
  fastify.put<{ Params: { leagueId: string; userId: string }; Body: SetHandicapBody }>('/leagues/:leagueId/players/:userId', {
    schema: {
      params: leagueUserIdParamsSchema,
      body: setHandicapSchema,
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { leagueId, userId } = request.params;
    const currentUserId = request.user.id.toString();

    // Allow if user is setting their own handicap, or if they're a league manager
    const isSelf = currentUserId === userId;
    const isManager = request.user.leagues?.[leagueId] === 'manager';
    const isAdmin = request.user.platform_role === 'admin';
    const isLocationOwner = Object.keys(request.user.locations || {}).length > 0;

    if (!isSelf && !isManager && !isAdmin && !isLocationOwner) {
      reply.code(403).send({ error: 'Not authorized to set this handicap' });
      return;
    }

    const result = await handicapsService.setPlayerHandicap({
      userId,
      leagueId,
      handicapIndex: request.body.handicap_index,
      effectiveDate: request.body.effective_date ? new Date(request.body.effective_date) : undefined,
    });

    reply.send({
      message: result.updated ? 'Handicap updated' : 'Handicap set',
    });
  });

  // Get a player's handicap history in a league
  fastify.get<{ Params: { leagueId: string; userId: string } }>('/leagues/:leagueId/players/:userId/history', {
    schema: {
      params: leagueUserIdParamsSchema,
      response: {
        200: { type: 'array', items: handicapHistorySchema },
        500: errorResponseSchema,
      },
    },
  }, async (request) => {
    return handicapsService.getPlayerHandicapHistory(
      request.params.userId,
      request.params.leagueId
    );
  });

  // Get team handicap
  fastify.get<{ Params: { teamId: string } }>('/teams/:teamId', {
    schema: {
      params: teamIdParamsSchema,
      response: {
        200: teamHandicapSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request) => {
    return handicapsService.getTeamHandicap(request.params.teamId);
  });

  // Manually set team handicap (manager only, when mode is 'manual')
  fastify.put<{ Params: { teamId: string }; Body: SetTeamHandicapBody }>('/teams/:teamId', {
    schema: {
      params: teamIdParamsSchema,
      body: setTeamHandicapSchema,
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    // Look up team to get league_id for auth check
    const team = await db.selectFrom('teams')
      .select(['league_id'])
      .where('id', '=', request.params.teamId)
      .executeTakeFirst();

    if (!team) {
      reply.code(404).send({ error: 'Team not found' });
      return;
    }

    const isManager = request.user.leagues?.[team.league_id] === 'manager';
    const isAdmin = request.user.platform_role === 'admin';
    const isLocationOwner = Object.keys(request.user.locations || {}).length > 0;

    if (!isManager && !isAdmin && !isLocationOwner) {
      reply.code(403).send({ error: 'Not authorized to set team handicap' });
      return;
    }

    await handicapsService.setTeamHandicap(
      request.params.teamId,
      request.body.team_handicap
    );

    reply.send({ message: 'Team handicap updated' });
  });
}
