import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { LeagueMemberRole } from '../../types/database';
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
  LeagueDetail,
  leagueMemberSchema,
  leagueMembershipRequestSchema,
  createMembershipRequestSchema,
  updateLeagueMemberSchema,
  memberParamsSchema,
  requestParamsSchema,
  CreateMembershipRequestBody,
  UpdateLeagueMemberBody
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

  // LEAGUE MEMBERSHIP ENDPOINTS

  // Get league members
  fastify.get('/:id/members', {
    schema: {
      description: 'Get all members of a league',
      tags: ['leagues'],
      params: leagueParamsSchema,
      response: {
        200: {
          type: 'array',
          items: leagueMemberSchema
        },
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      const members = await leaguesService.getLeagueMembers(id);
      return members;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add a member to a league (managers only)
  fastify.post<{ Params: { id: string }; Body: UpdateLeagueMemberBody }>('/:id/members', {
    schema: {
      description: 'Add a user to a league with a role (managers only)',
      tags: ['leagues'],
      params: leagueParamsSchema,
      body: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['player', 'spectator', 'manager'] }
        },
        required: ['user_id', 'role']
      },
      response: {
        201: leagueMemberSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { user_id, role } = request.body as { user_id: string; role: LeagueMemberRole };
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized to add members
      const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'Not authorized to manage league members' });
        return;
      }
      
      // Add the member
      const member = await leaguesService.addLeagueMember(id, user_id, role);
      
      if (!member) {
        reply.code(400).send({ error: 'Failed to add member' });
        return;
      }
      
      reply.code(201).send(member);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update a league member's role (managers only)
  fastify.put<{ Params: { id: string; memberId: string }; Body: UpdateLeagueMemberBody }>('/:id/members/:memberId', {
    schema: {
      description: 'Update a league member\'s role (managers only)',
      tags: ['leagues'],
      params: memberParamsSchema,
      body: updateLeagueMemberSchema,
      response: {
        200: leagueMemberSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id, memberId } = request.params;
      const { role } = request.body;
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized
      const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'Not authorized to manage league members' });
        return;
      }
      
      // Update the member
      const member = await leaguesService.updateLeagueMemberRole(memberId, role);
      
      if (!member) {
        reply.code(404).send({ error: 'Member not found' });
        return;
      }
      
      return member;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Remove a member from a league (managers only)
  fastify.delete<{ Params: { id: string; memberId: string } }>('/:id/members/:memberId', {
    schema: {
      description: 'Remove a member from a league (managers only)',
      tags: ['leagues'],
      params: memberParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id, memberId } = request.params;
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized
      const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'Not authorized to manage league members' });
        return;
      }
      
      // Remove the member
      const success = await leaguesService.removeLeagueMember(memberId);
      
      if (!success) {
        reply.code(404).send({ error: 'Member not found' });
        return;
      }
      
      reply.send({ message: 'Member removed successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get membership requests for a league (managers only)
  fastify.get('/:id/join-requests', {
    schema: {
      description: 'Get league membership requests (managers only)',
      tags: ['leagues'],
      params: leagueParamsSchema,
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] }
        }
      },
      response: {
        200: {
          type: 'array',
          items: leagueMembershipRequestSchema
        },
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Querystring: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled' } 
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { status = 'pending' } = request.query;
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized
      const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'Not authorized to view league requests' });
        return;
      }
      
      const requests = await leaguesService.getLeagueMembershipRequests(id, status);
      return requests;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create a membership request
  fastify.post<{ Body: CreateMembershipRequestBody }>('/:id/join', {
    schema: {
      description: 'Request to join a league with a specific role',
      tags: ['leagues'],
      body: createMembershipRequestSchema,
      response: {
        201: successMessageSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { requested_role, message } = request.body;
      const userId = request.user.id.toString();
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // If requesting manager role, check if the league is recently created
      if (requested_role === 'manager') {
        // Check if the league has at least one manager already
        const hasManagers = await leaguesService.getLeagueMembers(id)
          .then(members => members.some(m => m.role === 'manager'));
        
        if (hasManagers) {
          const isOwner = await leaguesService.isUserLocationManager(league.location_id, userId);
          if (!isOwner) {
            reply.code(400).send({ 
              error: 'Only location owners can request manager role for established leagues' 
            });
            return;
          }
        }
      }
      
      try {
        await leaguesService.createLeagueMembershipRequest(
          id,
          userId,
          requested_role,
          message
        );
        
        reply.code(201).send({ message: 'Membership request created successfully' });
      } catch (err) {
        if (err instanceof Error) {
          reply.code(400).send({ error: err.message });
          return;
        }
        throw err;
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get my membership requests
  fastify.get('/my-requests', {
    schema: {
      description: 'Get current user\'s league membership requests',
      tags: ['leagues'],
      response: {
        200: {
          type: 'array',
          items: leagueMembershipRequestSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      const requests = await leaguesService.getUserMembershipRequests(userId);
      return requests;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Approve a membership request (managers only)
  fastify.post<{ Params: { id: string; requestId: string } }>('/:id/requests/:requestId/approve', {
    schema: {
      description: 'Approve a league membership request (managers only)',
      tags: ['leagues'],
      params: requestParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id, requestId } = request.params;
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized
      const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'Not authorized to manage league requests' });
        return;
      }
      
      try {
        const success = await leaguesService.approveLeagueMembershipRequest(requestId);
        if (success) {
          reply.send({ message: 'Membership request approved' });
        } else {
          reply.code(404).send({ error: 'Request not found' });
        }
      } catch (err) {
        if (err instanceof Error) {
          reply.code(400).send({ error: err.message });
          return;
        }
        throw err;
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Reject a membership request (managers only)
  fastify.post<{ Params: { id: string; requestId: string } }>('/:id/requests/:requestId/reject', {
    schema: {
      description: 'Reject a league membership request (managers only)',
      tags: ['leagues'],
      params: requestParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id, requestId } = request.params;
      
      // Check if league exists
      const league = await leaguesService.getLeagueById(id);
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Check if user is authorized
      const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'Not authorized to manage league requests' });
        return;
      }
      
      const success = await leaguesService.rejectLeagueMembershipRequest(requestId);
      
      if (!success) {
        reply.code(404).send({ error: 'Request not found' });
        return;
      }
      
      reply.send({ message: 'Membership request rejected' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 