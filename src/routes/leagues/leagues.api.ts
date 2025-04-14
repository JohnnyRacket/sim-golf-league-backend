import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { 
  leagueSchema, 
  leagueDetailSchema,
  leagueWithLocationSchema,
  userLeagueMembershipSchema,
  leagueStandingsSchema,
  createLeagueSchema, 
  updateLeagueSchema,
  leagueParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  CreateLeagueBody, 
  UpdateLeagueBody,
  LeagueWithLocation,
  LeagueDetail
} from './leagues.types';
import { LeaguesService } from './leagues.service';

export async function leagueRoutes(fastify: FastifyInstance) {
  // Initialize service
  const leaguesService = new LeaguesService(db);

  // Get all leagues
  fastify.get('/', {
    schema: {
      description: 'Get all leagues',
      tags: ['leagues'],
      querystring: {
        type: 'object',
        properties: {
          location_id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: leagueWithLocationSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { location_id?: string }}>, reply) => {
    try {
      const { location_id } = request.query;
      return await leaguesService.getAllLeagues(location_id);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get leagues the current user is participating in
  fastify.get('/my', {
    schema: {
      description: 'Get leagues the current user is participating in',
      tags: ['leagues'],
      response: {
        200: {
          type: 'array',
          items: userLeagueMembershipSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      // Find leagues through team membership
      const leagues = await leaguesService.getLeaguesByUserMembership(userId);
      
      return leagues;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get leagues the current user manages
  fastify.get('/managed', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Get leagues managed by the current user',
      tags: ['leagues'],
      response: {
        200: {
          type: 'array',
          items: leagueWithLocationSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      return await leaguesService.getLeaguesByManager(userId);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get league standings
  fastify.get('/:id/standings', {
    schema: {
      description: 'Get standings for a league',
      tags: ['leagues'],
      params: leagueParamsSchema,
      response: {
        200: leagueStandingsSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    try {
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Get standings
      const standings = await leaguesService.getLeagueStandings(id);
      
      return {
        league: {
          id: league.id,
          name: league.name,
          status: league.status
        },
        standings
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get league by ID with teams
  fastify.get('/:id', {
    schema: {
      description: 'Get league by ID with teams',
      tags: ['leagues'],
      params: leagueParamsSchema,
      response: {
        200: leagueDetailSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      return league;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new league (manager only)
  fastify.post<{ Body: CreateLeagueBody }>('/', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Create a new league',
      tags: ['leagues'],
      body: createLeagueSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        },
        400: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        name, 
        location_id, 
        start_date, 
        end_date, 
        description, 
        max_teams = 8, 
        simulator_settings = {},
        status = 'pending'
      } = request.body;
      
      const userId = request.user.id.toString();
      
      // Check if user is a manager for this location
      const isLocationManager = await leaguesService.isUserLocationManager(location_id, userId);
      
      if (!isLocationManager) {
        reply.code(403).send({ error: 'You are not authorized to create leagues for this location' });
        return;
      }
      
      // Create league
      const league = await leaguesService.createLeague({
        name,
        location_id,
        start_date,
        end_date,
        description,
        max_teams,
        simulator_settings,
        status
      });
      
      reply.code(201).send({ 
        message: 'League created successfully', 
        id: league.id 
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update league (manager only)
  fastify.put<{ Params: { id: string }; Body: UpdateLeagueBody }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Update a league',
      tags: ['leagues'],
      params: leagueParamsSchema,
      body: updateLeagueSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      const userId = request.user.id.toString();
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized to update this league
      const isAuthorized = await leaguesService.isUserLeagueManager(id, userId);
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to update this league' });
        return;
      }
      
      // Update league
      const updatedLeague = await leaguesService.updateLeague(id, updateData);
      
      if (!updatedLeague) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      reply.send({ message: 'League updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete league (manager only)
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Delete a league',
      tags: ['leagues'],
      params: leagueParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized to delete this league
      const isAuthorized = await leaguesService.isUserLeagueManager(id, userId);
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to delete this league' });
        return;
      }
      
      // Delete league
      const deleted = await leaguesService.deleteLeague(id);
      
      if (!deleted) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      reply.send({ message: 'League deleted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 