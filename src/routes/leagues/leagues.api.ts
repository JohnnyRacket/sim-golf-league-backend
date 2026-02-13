import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole, checkLeagueRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { LeagueMemberRole } from '../../types/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
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
  }, async (request: FastifyRequest<{ Querystring: { location_id?: string }}>) => {
    const { location_id } = request.query;
    return leaguesService.getAllLeagues(location_id);
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
  }, async (request) => {
    const userId = request.user.id.toString();
    return leaguesService.getLeaguesByUserMembership(userId);
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
  }, async (request) => {
    const userId = request.user.id.toString();
    return leaguesService.getLeaguesByManager(userId);
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
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const standings = await leaguesService.getLeagueStandings(id);

    return {
      league: {
        id: league.id,
        name: league.name,
        status: league.status
      },
      standings
    };
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
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;
    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }
    return league;
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
    const {
      name,
      location_id,
      start_date,
      end_date,
      description,
      max_teams = 8,
      simulator_settings = {},
      status = 'pending',
      banner_image_url,
      cost,
      payment_type,
      day_of_week,
      start_time,
      bays,
      scheduling_format,
      playoff_format,
      playoff_size,
      prize_breakdown
    } = request.body;

    const userId = request.user.id.toString();

    const isLocationManager = await leaguesService.isUserLocationManager(location_id, userId);
    if (!isLocationManager) {
      return reply.code(403).send({ error: 'You are not authorized to create leagues for this location' });
    }

    const league = await leaguesService.createLeague({
      name, location_id, start_date, end_date, description,
      max_teams, simulator_settings, status, banner_image_url,
      cost, payment_type, day_of_week, start_time, bays,
      scheduling_format, playoff_format, playoff_size, prize_breakdown
    });

    return reply.code(201).send({
      message: 'League created successfully',
      id: league.id
    });
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
    const { id } = request.params;
    const updateData = request.body;
    const userId = request.user.id.toString();

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, userId);
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'You are not authorized to update this league' });
    }

    const updatedLeague = await leaguesService.updateLeague(id, updateData);
    if (!updatedLeague) {
      throw new NotFoundError('League');
    }

    return { message: 'League updated successfully' };
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
    const { id } = request.params;
    const userId = request.user.id.toString();

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, userId);
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'You are not authorized to delete this league' });
    }

    const deleted = await leaguesService.deleteLeague(id);
    if (!deleted) {
      throw new NotFoundError('League');
    }

    return { message: 'League deleted successfully' };
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
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    return leaguesService.getLeagueMembers(id);
  });

  // Add a member to a league (managers only)
  fastify.post<{ Params: { id: string }; Body: UpdateLeagueMemberBody }>('/:id/members', {
    preHandler: checkLeagueRole('id', ['manager']),
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
    const { id } = request.params;
    const { user_id, role } = request.body as { user_id: string; role: LeagueMemberRole };

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'Not authorized to manage league members' });
    }

    const member = await leaguesService.addLeagueMember(id, user_id, role);
    if (!member) {
      throw new ValidationError('Failed to add member');
    }

    return reply.code(201).send(member);
  });

  // Update a league member's role (managers only)
  fastify.put<{ Params: { id: string; memberId: string }; Body: UpdateLeagueMemberBody }>('/:id/members/:memberId', {
    preHandler: checkLeagueRole('id', ['manager']),
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
    const { id, memberId } = request.params;
    const { role } = request.body;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'Not authorized to manage league members' });
    }

    const member = await leaguesService.updateLeagueMemberRole(memberId, role);
    if (!member) {
      throw new NotFoundError('Member');
    }

    return member;
  });

  // Remove a member from a league (managers only)
  fastify.delete<{ Params: { id: string; memberId: string } }>('/:id/members/:memberId', {
    preHandler: checkLeagueRole('id', ['manager']),
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
    const { id, memberId } = request.params;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'Not authorized to manage league members' });
    }

    const success = await leaguesService.removeLeagueMember(memberId);
    if (!success) {
      throw new NotFoundError('Member');
    }

    return { message: 'Member removed successfully' };
  });

  // Get membership requests for a league (managers only)
  fastify.get<{
    Params: { id: string };
    Querystring: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled' }
  }>('/:id/join-requests', {
    preHandler: checkLeagueRole('id', ['manager']),
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
  }, async (request, reply) => {
    const { id } = request.params;
    const { status = 'pending' } = request.query;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'Not authorized to view league requests' });
    }

    return leaguesService.getLeagueMembershipRequests(id, status);
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
    const { id } = request.params as { id: string };
    const { requested_role, message } = request.body;
    const userId = request.user.id.toString();

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    if (requested_role === 'manager') {
      const hasManagers = await leaguesService.getLeagueMembers(id)
        .then(members => members.some(m => m.role === 'manager'));

      if (hasManagers) {
        const isOwner = await leaguesService.isUserLocationManager(league.location_id, userId);
        if (!isOwner) {
          throw new ValidationError('Only location owners can request manager role for established leagues');
        }
      }
    }

    await leaguesService.createLeagueMembershipRequest(id, userId, requested_role, message);
    return reply.code(201).send({ message: 'Membership request created successfully' });
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
  }, async (request) => {
    const userId = request.user.id.toString();
    return leaguesService.getUserMembershipRequests(userId);
  });

  // Approve a membership request (managers only)
  fastify.post<{ Params: { id: string; requestId: string } }>('/:id/requests/:requestId/approve', {
    preHandler: checkLeagueRole('id', ['manager']),
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
    const { id, requestId } = request.params;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'Not authorized to manage league requests' });
    }

    const success = await leaguesService.approveLeagueMembershipRequest(requestId);
    if (!success) {
      throw new NotFoundError('Request');
    }

    return { message: 'Membership request approved' };
  });

  // Reject a membership request (managers only)
  fastify.post<{ Params: { id: string; requestId: string } }>('/:id/requests/:requestId/reject', {
    preHandler: checkLeagueRole('id', ['manager']),
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
    const { id, requestId } = request.params;

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, request.user.id.toString());
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'Not authorized to manage league requests' });
    }

    const success = await leaguesService.rejectLeagueMembershipRequest(requestId);
    if (!success) {
      throw new NotFoundError('Request');
    }

    return { message: 'Membership request rejected' };
  });

  // Generate schedule for a league (manager only)
  fastify.post<{ Params: { id: string } }>('/:id/generate-schedule', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Generate a schedule for a league (manager only)',
      tags: ['leagues'],
      params: leagueParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            matches_created: { type: 'integer' }
          }
        },
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id.toString();

    const league = await leaguesService.getLeagueById(id);
    if (!league) {
      throw new NotFoundError('League');
    }

    const isAuthorized = await leaguesService.isUserLeagueManager(id, userId);
    if (!isAuthorized) {
      return reply.code(403).send({ error: 'You are not authorized to generate schedule for this league' });
    }

    const teams = await leaguesService.getLeagueTeams(id);
    if (teams.length < 2) {
      throw new ValidationError('At least two teams are required to generate a schedule');
    }

    const matchesCreated = await leaguesService.generateSchedule(id, teams, league.scheduling_format);

    return {
      message: 'League schedule generated successfully',
      matches_created: matchesCreated
    };
  });
}
