import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { MatchStatus, MatchGameStatus } from '../../types/database';
import { sql } from 'kysely';

// Schema definitions
const matchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    league_id: { type: 'string', format: 'uuid' },
    home_team_id: { type: 'string', format: 'uuid' },
    away_team_id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    player_details: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'league_id', 'home_team_id', 'away_team_id', 'match_date', 'status', 'player_details']
};

const createMatchSchema = {
  type: 'object',
  properties: {
    league_id: { type: 'string', format: 'uuid' },
    home_team_id: { type: 'string', format: 'uuid' },
    away_team_id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }
  },
  required: ['league_id', 'home_team_id', 'away_team_id', 'match_date']
};

const updateMatchSchema = {
  type: 'object',
  properties: {
    match_date: { type: 'string', format: 'date-time' },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }
  }
};

const matchGameSchema = {
  type: 'object',
  properties: {
    game_number: { type: 'integer', minimum: 1 },
    home_player_id: { type: 'string', format: 'uuid' },
    away_player_id: { type: 'string', format: 'uuid' },
    home_score: { type: 'integer', nullable: true },
    away_score: { type: 'integer', nullable: true },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
  },
  required: ['game_number', 'home_player_id', 'away_player_id']
};

const scoreUpdateSchema = {
  type: 'object',
  properties: {
    home_score: { type: 'integer' },
    away_score: { type: 'integer' }
  },
  required: ['home_score', 'away_score']
};

interface CreateMatchBody {
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  simulator_settings?: Record<string, any>;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface UpdateMatchBody {
  match_date?: string;
  simulator_settings?: Record<string, any>;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface MatchGameBody {
  game_number: number;
  home_player_id: string;
  away_player_id: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: 'pending' | 'in_progress' | 'completed';
}

interface ScoreUpdateBody {
  home_score: number;
  away_score: number;
}

export async function matchRoutes(fastify: FastifyInstance) {
  // Get upcoming matches for current user
  fastify.get('/upcoming', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      // Find team memberships
      const teamMemberships = await db.selectFrom('team_members')
        .select('team_id')
        .where('user_id', '=', userId)
        .where('status', '=', 'active')
        .execute();
      
      if (teamMemberships.length === 0) {
        return []; // No teams, so no matches
      }
      
      const teamIds = teamMemberships.map(tm => tm.team_id);
      
      // Get upcoming matches for user's teams
      const upcomingMatches = await db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name',
          'leagues.id as league_id',
          'leagues.name as league_name'
        ])
        .where(eb => eb.or([
          eb('home_team.id', 'in', teamIds),
          eb('away_team.id', 'in', teamIds)
        ]))
        .where(eb => eb.or([
          eb('matches.status', '=', 'scheduled' as MatchStatus),
          eb('matches.status', '=', 'in_progress' as MatchStatus)
        ]))
        .where('matches.match_date', '>=', new Date())
        .orderBy('matches.match_date', 'asc')
        .execute();
      
      return upcomingMatches;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all matches with filtering options
  fastify.get('/', async (request: FastifyRequest<{ 
    Querystring: { 
      league_id?: string; 
      team_id?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
      user_id?: string;
      include_stats?: boolean;
    } 
  }>, reply: FastifyReply) => {
    try {
      const { league_id, team_id, status, from_date, to_date, user_id, include_stats } = request.query;
      
      let query = db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'matches.simulator_settings',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name',
          'leagues.id as league_id',
          'leagues.name as league_name'
        ]);
      
      // Apply filters
      if (league_id) {
        query = query.where('matches.league_id', '=', league_id);
      }
      
      if (team_id) {
        query = query.where(eb => eb.or([
          eb('home_team.id', '=', team_id),
          eb('away_team.id', '=', team_id)
        ]));
      }
      
      if (status) {
        query = query.where('matches.status', '=', status as MatchStatus);
      }
      
      if (from_date) {
        query = query.where('matches.match_date', '>=', new Date(from_date));
      }
      
      if (to_date) {
        query = query.where('matches.match_date', '<=', new Date(to_date));
      }

      if (user_id) {
        query = query
          .innerJoin('match_games as user_games', 'user_games.match_id', 'matches.id')
          .innerJoin('team_members as player', (join) => 
            join.on((eb) => eb.or([
              eb('player.id', '=', eb.ref('user_games.home_player_id')),
              eb('player.id', '=', eb.ref('user_games.away_player_id'))
            ]))
          )
          .where('player.user_id', '=', user_id);
      }
      
      // Get game statistics if requested
      if (include_stats) {
        // Create a separate query for game statistics to avoid type issues
        const matches = await query.execute();
        
        // Get statistics for each match
        const matchesWithStats = await Promise.all(
          matches.map(async (match) => {
            const stats = await db.selectFrom('match_games')
              .select([
                sql<number>`SUM(CASE WHEN home_score > away_score THEN 1 ELSE 0 END)`.as('home_games_won'),
                sql<number>`SUM(CASE WHEN away_score > home_score THEN 1 ELSE 0 END)`.as('away_games_won')
              ])
              .where('match_id', '=', match.id)
              .executeTakeFirst();
            
            return {
              ...match,
              home_games_won: stats?.home_games_won ?? 0,
              away_games_won: stats?.away_games_won ?? 0
            };
          })
        );
        
        return matchesWithStats;
      }
      
      const matches = await query
        .orderBy('matches.match_date', 'desc')
        .execute();
      
      return matches;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get match by ID with games
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      // Get match details
      const match = await db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name',
          'leagues.id as league_id',
          'leagues.name as league_name'
        ])
        .where('matches.id', '=', id)
        .executeTakeFirst();
      
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Get games for this match
      const games = await db.selectFrom('match_games')
        .leftJoin('team_members as home_player_member', 'home_player_member.id', 'match_games.home_player_id')
        .leftJoin('team_members as away_player_member', 'away_player_member.id', 'match_games.away_player_id')
        .leftJoin('users as home_user', 'home_user.id', 'home_player_member.user_id')
        .leftJoin('users as away_user', 'away_user.id', 'away_player_member.user_id')
        .select([
          'match_games.id',
          'match_games.game_number',
          'match_games.home_player_id',
          'match_games.away_player_id',
          'match_games.home_score',
          'match_games.away_score',
          'match_games.status',
          'home_user.username as home_player_name',
          'away_user.username as away_player_name'
        ])
        .where('match_games.match_id', '=', id)
        .orderBy('match_games.game_number')
        .execute();
      
      return {
        ...match,
        games
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new match (managers only)
  fastify.post<{ Body: CreateMatchBody }>('/', {
    preHandler: checkRole(['manager']),
    schema: {
      body: createMatchSchema
    }
  }, async (request, reply) => {
    try {
      const { league_id, home_team_id, away_team_id, match_date, simulator_settings, status = 'scheduled' } = request.body;
      
      // Verify league exists
      const league = await db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select(['leagues.id', 'leagues.name', 'leagues.simulator_settings', 'managers.user_id'])
        .where('leagues.id', '=', league_id)
        .executeTakeFirst();
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is manager of this league
      if (league.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to create matches in this league' });
        return;
      }
      
      // Verify teams exist and are in the specified league
      const homeTeam = await db.selectFrom('teams')
        .select(['id', 'name'])
        .where('id', '=', home_team_id)
        .where('league_id', '=', league_id)
        .executeTakeFirst();
      
      if (!homeTeam) {
        reply.code(404).send({ error: 'Home team not found or not in the specified league' });
        return;
      }
      
      const awayTeam = await db.selectFrom('teams')
        .select(['id', 'name'])
        .where('id', '=', away_team_id)
        .where('league_id', '=', league_id)
        .executeTakeFirst();
      
      if (!awayTeam) {
        reply.code(404).send({ error: 'Away team not found or not in the specified league' });
        return;
      }
      
      // Check that teams are not the same
      if (home_team_id === away_team_id) {
        reply.code(400).send({ error: 'Home team and away team cannot be the same' });
        return;
      }
      
      // Generate match ID
      const matchId = uuidv4();
      
      // Create the match
      await db.insertInto('matches')
        .values({
          id: matchId,
          league_id,
          home_team_id,
          away_team_id,
          match_date: new Date(match_date),
          status: status as MatchStatus
        })
        .execute();
      
      // Determine which simulator settings to use (provided or league default)
      const finalSimulatorSettings = simulator_settings || league.simulator_settings;
      
      // If simulator_settings is provided or league has defaults, update it separately
      if (finalSimulatorSettings) {
        await db.updateTable('matches')
          .set({
            simulator_settings: JSON.stringify(finalSimulatorSettings) as any
          })
          .where('id', '=', matchId)
          .execute();
      }
      
      reply.code(201).send({
        message: 'Match created successfully',
        id: matchId
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update match
  fastify.put<{ Params: { id: string }; Body: UpdateMatchBody }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: updateMatchSchema
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      // Verify match exists and user is authorized
      const match = await db.selectFrom('matches')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select(['matches.id', 'managers.user_id'])
        .where('matches.id', '=', id)
        .executeTakeFirst();
      
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Check if user is manager of this league
      if (match.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to update this match' });
        return;
      }
      
      // Prepare update data
      const data: Record<string, any> = {};
      if (updateData.match_date) data.match_date = new Date(updateData.match_date);
      if (updateData.status) data.status = updateData.status;
      
      // Update match basic fields
      if (Object.keys(data).length > 0) {
        await db.updateTable('matches')
          .set(data)
          .where('id', '=', id)
          .execute();
      }
      
      // Update simulator_settings separately if provided
      if (updateData.simulator_settings !== undefined) {
        await db.updateTable('matches')
          .set({
            simulator_settings: JSON.stringify(updateData.simulator_settings) as any
          })
          .where('id', '=', id)
          .execute();
      }
      
      reply.send({ message: 'Match updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add a game to a match
  fastify.post<{ Params: { id: string }; Body: MatchGameBody }>('/:id/games', {
    preHandler: checkRole(['manager']),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: matchGameSchema
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { game_number, home_player_id, away_player_id, home_score = null, away_score = null, status = 'pending' } = request.body;
      
      // Verify match exists and user is authorized
      const match = await db.selectFrom('matches')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select([
          'matches.id', 
          'matches.home_team_id', 
          'matches.away_team_id', 
          'matches.status as match_status',
          'managers.user_id'
        ])
        .where('matches.id', '=', id)
        .executeTakeFirst();
      
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Check if user is manager of this league
      if (match.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to add games to this match' });
        return;
      }
      
      // Verify players exist and belong to the correct teams
      const homePlayer = await db.selectFrom('team_members')
        .select('id')
        .where('id', '=', home_player_id)
        .where('team_id', '=', match.home_team_id)
        .executeTakeFirst();
      
      if (!homePlayer) {
        reply.code(404).send({ error: 'Home player not found or not in the home team' });
        return;
      }
      
      const awayPlayer = await db.selectFrom('team_members')
        .select('id')
        .where('id', '=', away_player_id)
        .where('team_id', '=', match.away_team_id)
        .executeTakeFirst();
      
      if (!awayPlayer) {
        reply.code(404).send({ error: 'Away player not found or not in the away team' });
        return;
      }
      
      // Check if game number already exists
      const existingGame = await db.selectFrom('match_games')
        .select('id')
        .where('match_id', '=', id)
        .where('game_number', '=', game_number)
        .executeTakeFirst();
      
      if (existingGame) {
        reply.code(400).send({ error: 'A game with this number already exists for this match' });
        return;
      }
      
      // Create game
      const gameId = uuidv4();
      
      await db.insertInto('match_games')
        .values({
          id: gameId,
          match_id: id,
          game_number,
          home_player_id,
          away_player_id,
          home_score,
          away_score,
          status: status as MatchGameStatus
        })
        .execute();
      
      // If match is still in scheduled status, update to in_progress
      if (match.match_status === 'scheduled') {
        await db.updateTable('matches')
          .set({ status: 'in_progress' as MatchStatus })
          .where('id', '=', id)
          .execute();
      }
      
      reply.code(201).send({
        message: 'Game added successfully',
        id: gameId
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update game score
  fastify.put<{ Params: { match_id: string; game_id: string }; Body: ScoreUpdateBody }>('/:match_id/games/:game_id/score', async (request, reply) => {
    try {
      const { match_id, game_id } = request.params;
      const { home_score, away_score } = request.body;
      
      // Verify game exists
      const game = await db.selectFrom('match_games')
        .innerJoin('matches', 'matches.id', 'match_games.match_id')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .innerJoin('team_members as home_player', 'home_player.id', 'match_games.home_player_id')
        .innerJoin('team_members as away_player', 'away_player.id', 'match_games.away_player_id')
        .select([
          'match_games.id',
          'match_games.status',
          'matches.status as match_status',
          'home_player.user_id as home_user_id',
          'away_player.user_id as away_user_id',
          'matches.home_team_id',
          'matches.away_team_id'
        ])
        .where('match_games.id', '=', game_id)
        .where('match_games.match_id', '=', match_id)
        .executeTakeFirst();
      
      if (!game) {
        reply.code(404).send({ error: 'Game not found' });
        return;
      }
      
      // Check authorization - managers can always update, players can only update their own games
      const userId = request.user.id.toString();
      const isManager = request.user.roles.includes('manager');
      const isHomePlayer = game.home_user_id === userId;
      const isAwayPlayer = game.away_user_id === userId;
      
      if (!isManager && !isHomePlayer && !isAwayPlayer) {
        reply.code(403).send({ error: 'You are not authorized to update this game score' });
        return;
      }
      
      // Check if match is in a valid state
      if (game.match_status === 'cancelled') {
        reply.code(400).send({ error: 'Cannot update scores for a cancelled match' });
        return;
      }
      
      // Update game score
      await db.updateTable('match_games')
        .set({ 
          home_score, 
          away_score,
          status: 'completed' as MatchGameStatus
        })
        .where('id', '=', game_id)
        .execute();
      
      // Check if all games are completed to mark match as completed
      const allGames = await db.selectFrom('match_games')
        .select('status')
        .where('match_id', '=', match_id)
        .execute();
      
      const allCompleted = allGames.every(g => g.status === 'completed');
      
      if (allCompleted) {
        await db.updateTable('matches')
          .set({ status: 'completed' as MatchStatus })
          .where('id', '=', match_id)
          .execute();
      }
      
      // Update player stats
      await updatePlayerStats(match_id);
      
      reply.send({ message: 'Game score updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Submit match result (admin or manager only)
  fastify.put<{ Params: { id: string }; Body: { status: string; games: any[] } }>('/:id/result', {
    preHandler: checkRole(['admin', 'manager']),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['in_progress', 'completed', 'cancelled'] },
          games: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                home_player_id: { type: 'string', format: 'uuid' },
                away_player_id: { type: 'string', format: 'uuid' },
                home_score: { type: 'integer', minimum: 0 },
                away_score: { type: 'integer', minimum: 0 }
              },
              required: ['home_player_id', 'away_player_id', 'home_score', 'away_score']
            }
          }
        },
        required: ['status', 'games']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, games } = request.body;
      
      // Verify match exists and user is authorized
      const match = await db.selectFrom('matches')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select([
          'matches.id', 
          'matches.home_team_id', 
          'matches.away_team_id',
          'managers.user_id'
        ])
        .where('matches.id', '=', id)
        .executeTakeFirst();
      
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Check if user is admin or the manager of this league
      const isAdmin = request.user.roles.includes('admin');
      const isManagerOfLeague = match.user_id.toString() === request.user.id.toString();
      
      if (!isAdmin && !isManagerOfLeague) {
        reply.code(403).send({ error: 'You are not authorized to submit results for this match' });
        return;
      }
      
      // Update match status
      await db.updateTable('matches')
        .set({ status: status as MatchStatus })
        .where('id', '=', id)
        .execute();
      
      // Delete existing games if any
      await db.deleteFrom('match_games')
        .where('match_id', '=', id)
        .execute();
      
      // Add new games
      for (const [index, game] of games.entries()) {
        const gameId = uuidv4();
        
        await db.insertInto('match_games')
          .values({
            id: gameId,
            match_id: id,
            game_number: index + 1,
            home_player_id: game.home_player_id,
            away_player_id: game.away_player_id,
            home_score: game.home_score,
            away_score: game.away_score,
            status: 'completed' as MatchGameStatus
          })
          .execute();
      }
      
      // Update player stats
      await updatePlayerStats(id);
      
      reply.send({ message: 'Match result submitted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user's match summary by league
  fastify.get('/user/:user_id/summary', async (request: FastifyRequest<{
    Params: { user_id: string }
  }>, reply: FastifyReply) => {
    const { user_id } = request.params;

    try {
      const summary = await db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .leftJoin('match_games', (join) => 
          join.on((eb) => eb.or([
            eb('match_games.home_player_id', '=', eb.ref('team_members.id')),
            eb('match_games.away_player_id', '=', eb.ref('team_members.id'))
          ]))
        )
        .select([
          'leagues.id as league_id',
          'leagues.name as league_name',
          'teams.id as team_id',
          'teams.name as team_name',
          sql<number>`COUNT(DISTINCT match_games.match_id)`.as('matches_played'),
          sql<number>`
            SUM(CASE 
              WHEN match_games.home_player_id = team_members.id AND match_games.home_score > match_games.away_score THEN 1
              WHEN match_games.away_player_id = team_members.id AND match_games.away_score > match_games.home_score THEN 1
              ELSE 0
            END)
          `.as('games_won'),
          sql<number>`
            AVG(CASE 
              WHEN match_games.home_player_id = team_members.id THEN match_games.home_score
              WHEN match_games.away_player_id = team_members.id THEN match_games.away_score
              ELSE NULL
            END)
          `.as('average_score')
        ])
        .where('team_members.user_id', '=', user_id)
        .groupBy([
          'leagues.id',
          'leagues.name',
          'teams.id',
          'teams.name'
        ])
        .execute();

      return summary;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Current user's match summary - shorthand endpoint
  fastify.get('/me/summary', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      const summary = await db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .leftJoin('match_games', (join) => 
          join.on((eb) => eb.or([
            eb('match_games.home_player_id', '=', eb.ref('team_members.id')),
            eb('match_games.away_player_id', '=', eb.ref('team_members.id'))
          ]))
        )
        .select([
          'leagues.id as league_id',
          'leagues.name as league_name',
          'teams.id as team_id',
          'teams.name as team_name',
          sql<number>`COUNT(DISTINCT match_games.match_id)`.as('matches_played'),
          sql<number>`
            SUM(CASE 
              WHEN match_games.home_player_id = team_members.id AND match_games.home_score > match_games.away_score THEN 1
              WHEN match_games.away_player_id = team_members.id AND match_games.away_score > match_games.home_score THEN 1
              ELSE 0
            END)
          `.as('games_won'),
          sql<number>`
            AVG(CASE 
              WHEN match_games.home_player_id = team_members.id THEN match_games.home_score
              WHEN match_games.away_player_id = team_members.id THEN match_games.away_score
              ELSE NULL
            END)
          `.as('average_score')
        ])
        .where('team_members.user_id', '=', userId)
        .groupBy([
          'leagues.id',
          'leagues.name',
          'teams.id',
          'teams.name'
        ])
        .execute();

      return summary;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Helper function to update player stats
  async function updatePlayerStats(matchId: string) {
    try {
      // Get match data
      const match = await db.selectFrom('matches')
        .select(['id', 'league_id', 'player_details'])
        .where('id', '=', matchId)
        .executeTakeFirst();
      
      if (!match || !match.player_details) return;
      
      // Process player details from the match record
      const playerDetails = match.player_details;
      
      // Extract user IDs and collect stats
      const userStats = new Map<string, { games_played: number, games_won: number, total_score: number }>();
      
      // Process each player's data from player_details
      for (const playerId in playerDetails) {
        const playerData = playerDetails[playerId];
        
        // Get user ID from the player ID (team member ID)
        const teamMember = await db.selectFrom('team_members')
          .select('user_id')
          .where('id', '=', playerId)
          .executeTakeFirst();
        
        if (!teamMember) continue;
        
        const userId = teamMember.user_id;
        
        if (!userStats.has(userId)) {
          userStats.set(userId, { games_played: 0, games_won: 0, total_score: 0 });
        }
        
        const stats = userStats.get(userId)!;
        stats.games_played += 1;
        
        if (playerData.score !== undefined && playerData.score !== null) {
          stats.total_score += playerData.score;
          
          // Determine win/loss based on opponent score
          if (playerData.opponent_score !== undefined && playerData.opponent_score !== null && 
              playerData.score > playerData.opponent_score) {
            stats.games_won += 1;
          }
        }
      }
      
      // Update stats for each player
      for (const [userId, stats] of userStats.entries()) {
        // Check if stats exist for this user and league
        const existingStats = await db.selectFrom('stats')
          .select(['id', 'games_played', 'games_won', 'total_score'])
          .where('user_id', '=', userId)
          .where('league_id', '=', match.league_id)
          .executeTakeFirst();
        
        if (existingStats) {
          // Update existing stats
          await db.updateTable('stats')
            .set({
              games_played: existingStats.games_played + stats.games_played,
              games_won: existingStats.games_won + stats.games_won,
              total_score: existingStats.total_score + stats.total_score
            })
            .where('id', '=', existingStats.id)
            .execute();
        } else {
          // Create new stats
          await db.insertInto('stats')
            .values({
              user_id: userId,
              league_id: match.league_id,
              games_played: stats.games_played,
              games_won: stats.games_won,
              total_score: stats.total_score,
              handicap: 0 // Default handicap
            })
            .execute();
        }
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }
} 