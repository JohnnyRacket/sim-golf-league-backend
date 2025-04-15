import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { 
  teamSchema, 
  teamDetailSchema,
  teamWithMemberCountSchema,
  createTeamSchema, 
  updateTeamSchema, 
  teamMemberBodySchema,
  joinRequestBodySchema,
  memberRoleUpdateSchema,
  joinRequestSchema,
  teamIdParamSchema,
  teamMemberIdParamSchema,
  joinRequestIdParamSchema,
  errorResponseSchema,
  successMessageSchema,
  createdTeamResponseSchema,
  memberResponseSchema,
  joinRequestResponseSchema,
  CreateTeamBody,
  UpdateTeamBody,
  TeamMemberBody,
  JoinRequestBody,
  MemberRoleUpdateBody
} from './teams.types';
import { TeamsService } from './teams.service';

export async function teamRoutes(fastify: FastifyInstance) {
  // Initialize service
  const teamsService = new TeamsService(db);

  // Get all teams
  fastify.get('/', {
    schema: {
      description: 'Get all teams with optional league filtering',
      tags: ['teams'],
      querystring: {
        type: 'object',
        properties: {
          league_id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: teamSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { league_id?: string } }>, reply: FastifyReply) => {
    try {
      const { league_id } = request.query;
      return await teamsService.getAllTeams(league_id);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get teams the current user is part of
  fastify.get('/my', {
    schema: {
      description: 'Get teams the current user is a member of',
      tags: ['teams'],
      response: {
        200: {
          type: 'array',
          items: teamWithMemberCountSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      return await teamsService.getUserTeams(userId);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get join requests for the current user
  fastify.get('/join-requests/my', {
    schema: {
      description: 'Get all join requests for the current user',
      tags: ['teams'],
      response: {
        200: {
          type: 'array',
          items: joinRequestSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      return await teamsService.getUserJoinRequests(userId);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get team by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get team by ID with its members',
      tags: ['teams'],
      params: teamIdParamSchema,
      response: {
        200: teamDetailSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const team = await teamsService.getTeamById(id);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      return team;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new team (managers only)
  fastify.post<{ Body: CreateTeamBody }>('/', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Create a new team (manager only)',
      tags: ['teams'],
      body: createTeamSchema,
      response: {
        201: createdTeamResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { league_id, name, max_members = 6, status = 'active' } = request.body;
      
      // Check if user is authorized to manage this league
      const isAuthorized = await teamsService.isLeagueManager(league_id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to create teams in this league' });
        return;
      }
      
      // Create team
      const team = await teamsService.createTeam({
        league_id,
        name,
        max_members,
        status
      });
      
      reply.code(201).send({ 
        message: 'Team created successfully', 
        id: team.id 
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update team (managers only)
  fastify.put<{ Params: { id: string }; Body: UpdateTeamBody }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Update a team (manager only)',
      tags: ['teams'],
      params: teamIdParamSchema,
      body: updateTeamSchema,
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
      
      // Get team to check league
      const team = await teamsService.getTeamById(id);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized to manage this league
      const isAuthorized = await teamsService.isLeagueManager(team.league_id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to update this team' });
        return;
      }
      
      // Update team
      const updatedTeam = await teamsService.updateTeam(id, updateData);
      
      if (!updatedTeam) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      reply.send({ message: 'Team updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add member to team (managers only)
  fastify.post<{ Params: { id: string }; Body: TeamMemberBody }>('/:id/members', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Add a member to a team (manager only)',
      tags: ['teams'],
      params: teamIdParamSchema,
      body: teamMemberBodySchema,
      response: {
        201: memberResponseSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id: teamId } = request.params;
      const { user_id, role = 'member' } = request.body;
      
      // Get team to check league
      const team = await teamsService.getTeamById(teamId);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized to manage this league
      const isAuthorized = await teamsService.isLeagueManager(team.league_id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to add members to this team' });
        return;
      }
      
      // Check if team has available spots
      const hasAvailableSpots = await teamsService.hasAvailableSpots(teamId);
      
      if (!hasAvailableSpots) {
        reply.code(400).send({ error: 'Team is at maximum capacity' });
        return;
      }
      
      // Add member
      const member = await teamsService.addTeamMember(teamId, user_id, role);
      
      if (!member) {
        reply.code(400).send({ error: 'User is already a member of this team' });
        return;
      }
      
      reply.code(201).send({ 
        message: 'Member added successfully',
        member
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update team member role (managers only)
  fastify.put<{ Params: { id: string; memberId: string }; Body: MemberRoleUpdateBody }>('/:id/members/:memberId', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Update team member role (manager only)',
      tags: ['teams'],
      params: teamMemberIdParamSchema,
      body: memberRoleUpdateSchema,
      response: {
        200: memberResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id: teamId, memberId } = request.params;
      const { role } = request.body;
      
      // Get team to check league
      const team = await teamsService.getTeamById(teamId);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized to manage this league
      const isAuthorized = await teamsService.isLeagueManager(team.league_id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to update this team member' });
        return;
      }
      
      // Update member
      const updatedMember = await teamsService.updateTeamMember(memberId, role);
      
      if (!updatedMember) {
        reply.code(404).send({ error: 'Team member not found' });
        return;
      }
      
      reply.send({ 
        message: 'Member updated successfully',
        member: updatedMember
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Remove member from team (managers only)
  fastify.delete<{ Params: { id: string; memberId: string } }>('/:id/members/:memberId', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Remove a member from a team (manager only)',
      tags: ['teams'],
      params: teamMemberIdParamSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id: teamId, memberId } = request.params;
      
      // Get team to check league
      const team = await teamsService.getTeamById(teamId);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized to manage this league
      const isAuthorized = await teamsService.isLeagueManager(team.league_id, request.user.id.toString());
      
      if (!isAuthorized) {
        reply.code(403).send({ error: 'You are not authorized to remove members from this team' });
        return;
      }
      
      // Remove member
      const removed = await teamsService.removeTeamMember(memberId);
      
      if (!removed) {
        reply.code(404).send({ error: 'Team member not found' });
        return;
      }
      
      reply.send({ message: 'Member removed successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Request to join a team
  fastify.post<{ Body: JoinRequestBody }>('/join', {
    schema: {
      description: 'Request to join a team',
      tags: ['teams'],
      body: joinRequestBodySchema,
      response: {
        201: joinRequestResponseSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { team_id } = request.body;
      const userId = request.user.id.toString();
      
      // Check if team exists
      const team = await teamsService.getTeamById(team_id);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is already a member of this team
      const isTeamMember = await teamsService.isTeamMember(team_id, userId);
      if (isTeamMember) {
        reply.code(400).send({ error: 'You are already a member of this team' });
        return;
      }
      
      // Check if user is a member of the league
      const isLeagueMember = await teamsService.isLeagueMember(team.league_id, userId);
      if (!isLeagueMember) {
        reply.code(403).send({ error: 'You must be a member of the league to join a team' });
        return;
      }
      
      // Check if team has available spots
      const hasAvailableSpots = await teamsService.hasAvailableSpots(team_id);
      
      if (!hasAvailableSpots) {
        reply.code(400).send({ error: 'Team is at maximum capacity' });
        return;
      }
      
      // Create join request
      const requestResult = await teamsService.createJoinRequest(team_id, userId);
      
      reply.code(201).send({
        message: 'Join request submitted successfully',
        request_id: requestResult.id
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get join requests for a team (team members or league managers)
  fastify.get<{ Params: { id: string } }>('/:id/join-requests', {
    preHandler: checkRole(['manager']), // Keep this for basic role check
    schema: {
      description: 'Get join requests for a team (team members or league managers)',
      tags: ['teams'],
      params: teamIdParamSchema,
      response: {
        200: {
          type: 'array',
          items: joinRequestSchema
        },
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id: teamId } = request.params;
      const userId = request.user.id.toString();
      
      // Get team to check league
      const team = await teamsService.getTeamById(teamId);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized as either:
      // 1. A league manager
      // 2. A member of the team
      const isLeagueManager = await teamsService.isLeagueManager(team.league_id, userId);
      const isTeamMember = await teamsService.isTeamMember(teamId, userId);
      
      if (!isLeagueManager && !isTeamMember) {
        reply.code(403).send({ error: 'You are not authorized to view join requests for this team' });
        return;
      }
      
      // Get join requests
      const requests = await teamsService.getTeamJoinRequests(teamId);
      
      return requests;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Approve a join request (team members or league managers)
  fastify.post<{ Params: { id: string; requestId: string } }>('/:id/join-requests/:requestId/approve', {
    preHandler: checkRole(['manager']), // Keep this for basic role check
    schema: {
      description: 'Approve a join request (team members or league managers)',
      tags: ['teams'],
      params: joinRequestIdParamSchema,
      response: {
        200: memberResponseSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id: teamId, requestId } = request.params;
      const userId = request.user.id.toString();
      
      // Get team to check league
      const team = await teamsService.getTeamById(teamId);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized as either:
      // 1. A league manager
      // 2. A member of the team
      const isLeagueManager = await teamsService.isLeagueManager(team.league_id, userId);
      const isTeamMember = await teamsService.isTeamMember(teamId, userId);
      
      if (!isLeagueManager && !isTeamMember) {
        reply.code(403).send({ error: 'You are not authorized to approve join requests for this team' });
        return;
      }
      
      // Check if team has available spots
      const hasAvailableSpots = await teamsService.hasAvailableSpots(teamId);
      
      if (!hasAvailableSpots) {
        reply.code(400).send({ error: 'Team is at maximum capacity' });
        return;
      }
      
      // Approve request
      const member = await teamsService.approveJoinRequest(requestId);
      
      if (!member) {
        reply.code(404).send({ error: 'Join request not found or already processed' });
        return;
      }
      
      reply.send({
        message: 'Join request approved',
        member
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Reject a join request (team members or league managers)
  fastify.post<{ Params: { id: string; requestId: string } }>('/:id/join-requests/:requestId/reject', {
    preHandler: checkRole(['manager']), // Keep this for basic role check
    schema: {
      description: 'Reject a join request (team members or league managers)',
      tags: ['teams'],
      params: joinRequestIdParamSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id: teamId, requestId } = request.params;
      const userId = request.user.id.toString();
      
      // Get team to check league
      const team = await teamsService.getTeamById(teamId);
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user is authorized as either:
      // 1. A league manager
      // 2. A member of the team
      const isLeagueManager = await teamsService.isLeagueManager(team.league_id, userId);
      const isTeamMember = await teamsService.isTeamMember(teamId, userId);
      
      if (!isLeagueManager && !isTeamMember) {
        reply.code(403).send({ error: 'You are not authorized to reject join requests for this team' });
        return;
      }
      
      // Reject request
      const rejected = await teamsService.rejectJoinRequest(requestId);
      
      if (!rejected) {
        reply.code(404).send({ error: 'Join request not found or already processed' });
        return;
      }
      
      reply.send({ message: 'Join request rejected' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Cancel own join request
  fastify.post<{ Params: { requestId: string } }>('/join-requests/:requestId/cancel', {
    schema: {
      description: 'Cancel your own pending join request',
      tags: ['teams'],
      params: {
        type: 'object',
        properties: {
          requestId: { type: 'string', format: 'uuid' }
        },
        required: ['requestId']
      },
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { requestId } = request.params;
      const userId = request.user.id.toString();
      
      // Cancel request
      const cancelled = await teamsService.cancelJoinRequest(requestId, userId);
      
      if (!cancelled) {
        reply.code(404).send({ error: 'Join request not found or already processed' });
        return;
      }
      
      reply.send({ message: 'Join request cancelled' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 