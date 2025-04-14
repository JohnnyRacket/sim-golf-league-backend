import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { TeamStatus, TeamMemberRole } from '../../types/database';

// Schema definitions
const teamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    league_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'league_id', 'name', 'max_members', 'status']
};

const createTeamSchema = {
  type: 'object',
  properties: {
    league_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] }
  },
  required: ['league_id', 'name']
};

const updateTeamSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] }
  }
};

const teamMemberSchema = {
  type: 'object',
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['member'] }
  },
  required: ['user_id']
};

interface CreateTeamBody {
  league_id: string;
  name: string;
  max_members?: number;
  status?: 'active' | 'inactive';
}

interface UpdateTeamBody {
  name?: string;
  max_members?: number;
  status?: 'active' | 'inactive';
}

interface TeamMemberBody {
  user_id: string;
  role?: 'member';
}

export async function teamRoutes(fastify: FastifyInstance) {
  // Get all teams
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { league_id?: string } }>, reply: FastifyReply) => {
    try {
      const { league_id } = request.query;
      
      let query = db.selectFrom('teams')
        .selectAll();
      
      if (league_id) {
        query = query.where('league_id', '=', league_id);
      }
      
      return await query.execute();
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get teams the current user is part of
  fastify.get('/my', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      const teams = await db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .select([
          'teams.id',
          'teams.name',
          'teams.max_members',
          'teams.status',
          'team_members.role',
          'leagues.id as league_id',
          'leagues.name as league_name',
          'locations.name as location_name'
        ])
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .execute();
      
      // For each team, get member count
      const teamsWithMemberCount = await Promise.all(teams.map(async (team) => {
        const memberCount = await db.selectFrom('team_members')
          .select(({ fn }) => fn.count<number>('id').as('count'))
          .where('team_id', '=', team.id)
          .where('status', '=', 'active')
          .executeTakeFirst();
          
        return {
          ...team,
          member_count: memberCount?.count || 0
        };
      }));
      
      return teamsWithMemberCount;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get team by ID
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const team = await db.selectFrom('teams')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Get team members
      const members = await db.selectFrom('team_members')
        .innerJoin('users', 'users.id', 'team_members.user_id')
        .select([
          'team_members.id',
          'team_members.user_id',
          'team_members.role',
          'team_members.status',
          'users.username'
        ])
        .where('team_id', '=', id)
        .orderBy('team_members.role')
        .execute();
      
      return {
        ...team,
        members
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new team (managers only)
  fastify.post<{ Body: CreateTeamBody }>('/', {
    preHandler: checkRole(['manager']),
    schema: {
      body: createTeamSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { league_id, name, max_members = 6, status = 'active' } = request.body;
      
      // Check if league exists and manager has access
      const league = await db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select(['leagues.id', 'managers.user_id'])
        .where('leagues.id', '=', league_id)
        .executeTakeFirst();
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      if (league.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to create teams in this league' });
        return;
      }
      
      // Create team with new UUID
      const teamId = uuidv4();
      
      await db.insertInto('teams')
        .values({
          id: teamId,
          league_id,
          name,
          max_members,
          status: status as TeamStatus
        })
        .execute();
      
      reply.code(201).send({
        message: 'Team created successfully',
        id: teamId
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update team
  fastify.put<{ Params: { id: string }; Body: UpdateTeamBody }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: updateTeamSchema
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      // Check if team exists and manager has access
      const team = await db.selectFrom('teams')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select(['teams.id', 'managers.user_id'])
        .where('teams.id', '=', id)
        .executeTakeFirst();
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      if (team.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to update this team' });
        return;
      }
      
      // Update team
      await db.updateTable('teams')
        .set(updateData)
        .where('id', '=', id)
        .execute();
      
      reply.send({ message: 'Team updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add member to team
  fastify.post<{ Params: { id: string }; Body: TeamMemberBody }>('/:id/members', {
    preHandler: checkRole(['manager']),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: teamMemberSchema
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { user_id } = request.body;
      
      // Check if team exists
      const team = await db.selectFrom('teams')
        .select(['id', 'max_members'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if user exists
      const user = await db.selectFrom('users')
        .select('id')
        .where('id', '=', user_id)
        .executeTakeFirst();
      
      if (!user) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      
      // Check if member already exists in this team
      const existingMember = await db.selectFrom('team_members')
        .select(['id', 'status'])
        .where('team_id', '=', id)
        .where('user_id', '=', user_id)
        .executeTakeFirst();
      
      if (existingMember) {
        if (existingMember.status === 'active') {
          reply.code(400).send({ error: 'User is already a member of this team' });
          return;
        } else {
          // Reactivate inactive member
          await db.updateTable('team_members')
            .set({ status: 'active' as TeamStatus })
            .where('id', '=', existingMember.id)
            .execute();
          
          reply.code(200).send({
            message: 'Team member reactivated successfully',
            id: existingMember.id
          });
          return;
        }
      }
      
      // Check team member count against max_members
      const memberCount = await db.selectFrom('team_members')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('team_id', '=', id)
        .where('status', '=', 'active')
        .executeTakeFirst();
      
      if ((memberCount?.count || 0) >= team.max_members) {
        reply.code(400).send({ error: 'Team has reached maximum member count' });
        return;
      }
      
      // Add member to team
      const memberId = uuidv4();
      
      await db.insertInto('team_members')
        .values({
          id: memberId,
          team_id: id,
          user_id,
          role: 'member' as TeamMemberRole,
          status: 'active' as TeamStatus
        })
        .execute();
      
      reply.code(201).send({
        message: 'Team member added successfully',
        id: memberId
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Remove team member
  fastify.delete<{ Params: { id: string; member_id: string } }>('/:id/members/:member_id', async (request, reply) => {
    try {
      const { id, member_id } = request.params;
      
      // Check if team exists
      const team = await db.selectFrom('teams')
        .select(['id'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!team) {
        reply.code(404).send({ error: 'Team not found' });
        return;
      }
      
      // Check if member exists
      const member = await db.selectFrom('team_members')
        .select(['id', 'status'])
        .where('id', '=', member_id)
        .where('team_id', '=', id)
        .executeTakeFirst();
      
      if (!member) {
        reply.code(404).send({ error: 'Team member not found' });
        return;
      }
      
      // Mark member as inactive (soft delete)
      await db.updateTable('team_members')
        .set({ status: 'inactive' as TeamStatus })
        .where('id', '=', member_id)
        .execute();
      
      reply.send({ message: 'Team member removed successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 