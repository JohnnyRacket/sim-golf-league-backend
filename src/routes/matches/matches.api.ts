import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { MatchStatus, MatchTable } from '../../types/database';
import { MatchesService } from './matches.service';
import {
  matchSchema,
  createMatchSchema,
  updateMatchSchema,
  matchGameSchema,
  scoreUpdateSchema,
  CreateMatchBody,
  UpdateMatchBody,
  MatchGameBody,
  ScoreUpdateBody
} from './matches.types';

export async function matchRoutes(fastify: FastifyInstance) {
  // Initialize MatchesService
  const matchesService = new MatchesService(db);

  // GET ENDPOINTS

  // Get upcoming matches for current user
  fastify.get('/upcoming', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      // Use MatchesService to get upcoming matches
      const filters = {
        user_id: userId,
        status: 'scheduled' as MatchStatus,
        start_date: new Date()
      };
      
      // Get enhanced matches with team and league info
      const upcomingMatches = await matchesService.getEnhancedMatches(filters);
      
      return upcomingMatches.map(match => ({
        id: match.id,
        match_date: match.match_date,
        status: match.status,
        home_team_id: match.home_team_id,
        home_team_name: match.home_team?.name || 'Unknown',
        away_team_id: match.away_team_id,
        away_team_name: match.away_team?.name || 'Unknown',
        league_id: match.league_id,
        league_name: match.league?.name || 'Unknown'
      }));
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
      const { league_id, team_id, status, from_date, to_date, user_id } = request.query;
      
      // Build filters for the service
      const filters: any = {};
      if (league_id) filters.league_id = league_id;
      if (team_id) filters.team_id = team_id;
      if (status) filters.status = status as MatchStatus;
      if (from_date) filters.start_date = new Date(from_date);
      if (to_date) filters.end_date = new Date(to_date);
      if (user_id) filters.user_id = user_id;
      
      // Get enhanced matches with team and league info
      const enhancedMatches = await matchesService.getEnhancedMatches(filters);
      
      return enhancedMatches.map(match => ({
        id: match.id,
        match_date: match.match_date,
        status: match.status,
        simulator_settings: match.simulator_settings,
        home_team_id: match.home_team_id,
        home_team_name: match.home_team?.name || 'Unknown',
        home_team_score: match.home_team_score,
        away_team_id: match.away_team_id,
        away_team_name: match.away_team?.name || 'Unknown',
        away_team_score: match.away_team_score,
        league_id: match.league_id,
        league_name: match.league?.name || 'Unknown'
      }));
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get match by ID with games
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      // Get enhanced match from service
      const match = await matchesService.getEnhancedMatchById(id);
      
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Format response
      const matchWithDetails = {
        id: match.id,
        match_date: match.match_date,
        status: match.status,
        home_team_id: match.home_team_id,
        home_team_name: match.home_team?.name || 'Unknown',
        home_team_score: match.home_team_score,
        away_team_id: match.away_team_id,
        away_team_name: match.away_team?.name || 'Unknown',
        away_team_score: match.away_team_score,
        league_id: match.league_id,
        league_name: match.league?.name || 'Unknown',
        simulator_settings: match.simulator_settings,
        player_details: match.player_details || {}
      };
      
      return matchWithDetails;
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
      // Use service to get user match summaries
      const summaries = await matchesService.getUserMatchSummaries(user_id);
      return summaries;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Current user's match summary - shorthand endpoint
  fastify.get('/me/summary', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      // Use service to get user match summaries
      const summaries = await matchesService.getUserMatchSummaries(userId);
      return summaries;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST/PUT ENDPOINTS

  // Create new match (managers only)
  fastify.post<{ Body: CreateMatchBody }>('/', {
    preHandler: checkRole(['manager']),
    schema: {
      body: createMatchSchema
    }
  }, async (request, reply) => {
    try {
      const { league_id, home_team_id, away_team_id, match_date, simulator_settings, status = 'scheduled' } = request.body;
      
      // Get the league manager to check authorization
      const manager = await matchesService.getLeagueManager(league_id);
      
      if (!manager) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is manager of this league
      if (manager.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to create matches in this league' });
        return;
      }
      
      // Verify teams exist and are in the specified league using service
      const teamVerification = await matchesService.verifyTeamsForMatch(home_team_id, away_team_id, league_id);
      
      if (!teamVerification) {
        reply.code(400).send({ error: 'Invalid team selection. Teams must exist, be in the specified league, and cannot be the same.' });
        return;
      }
      
      // Generate match ID
      const matchId = uuidv4();
      
      // Create match data
      const matchData = {
        id: matchId,
        league_id,
        home_team_id,
        away_team_id,
        match_date: new Date(match_date),
        status: status as MatchStatus,
        home_team_score: 0,
        away_team_score: 0,
        simulator_settings: simulator_settings || {}
      };
      
      // Create the match using service
      const createdMatch = await matchesService.createMatch(matchData);
      
      reply.code(201).send({
        message: 'Match created successfully',
        id: createdMatch.id
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
      
      // Check if user is authorized to update this match
      const isAuthorized = await matchesService.isLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to update this match' });
        return;
      }
      
      // Prepare update data
      const data: Partial<Omit<MatchTable, "id" | "created_at" | "updated_at">> = {};
      if (updateData.match_date) data.match_date = new Date(updateData.match_date);
      if (updateData.status) data.status = updateData.status;
      if (updateData.simulator_settings) data.simulator_settings = updateData.simulator_settings;
      
      // Update match using service
      const updatedMatch = await matchesService.updateMatch(id, data);
      
      if (!updatedMatch) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      reply.send({ message: 'Match updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // DEPRECATED ENDPOINTS

  // Add a game to a match (deprecated)
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
      reply.code(410).send({ 
        error: 'This endpoint is deprecated',
        message: 'Games are now stored directly in the match record. Use the submit match results endpoint.'
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // FUNCTIONAL ENDPOINTS

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
      const { games } = request.body;
      
      // Check authorization
      const isAdmin = request.user.roles.includes('admin');
      const isManager = await matchesService.isLeagueManager(id, request.user.id.toString());
      
      if (!isAdmin && !isManager) {
        reply.code(403).send({ error: 'You are not authorized to submit results for this match' });
        return;
      }
      
      // Calculate team scores from games
      let homeTeamScore = 0;
      let awayTeamScore = 0;
      
      // Prepare player details
      const playerDetails: Record<string, any> = {};
      
      for (const game of games) {
        // Update team scores
        if (game.home_score > game.away_score) {
          homeTeamScore++;
        } else if (game.away_score > game.home_score) {
          awayTeamScore++;
        }
        
        // Store player details
        if (!playerDetails[game.home_player_id]) {
          playerDetails[game.home_player_id] = {
            score: game.home_score,
            opponent_score: game.away_score,
            opponent_id: game.away_player_id
          };
        }
        
        if (!playerDetails[game.away_player_id]) {
          playerDetails[game.away_player_id] = {
            score: game.away_score,
            opponent_score: game.home_score,
            opponent_id: game.home_player_id
          };
        }
      }
      
      // Submit match results using service
      const updatedMatch = await matchesService.submitMatchResults(
        id,
        homeTeamScore,
        awayTeamScore,
        playerDetails
      );
      
      if (!updatedMatch) {
        reply.code(404).send({ error: 'Failed to update match' });
        return;
      }
      
      reply.send({ message: 'Match result submitted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 