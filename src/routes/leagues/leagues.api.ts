import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { LeagueStatus } from '../../types/database';
import { sql } from 'kysely';

// Schema definitions
const leagueProperties = {
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  location_id: { type: 'string', format: 'uuid' },
  start_date: { type: 'string', format: 'date-time' },
  end_date: { type: 'string', format: 'date-time' },
  description: { type: 'string' },
  max_teams: { type: 'integer', minimum: 1 },
  simulator_settings: { 
    type: 'object',
    additionalProperties: true
  },
  status: { type: 'string', enum: ['active', 'completed', 'pending'] },
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }
};

const leagueSchema = {
  type: 'object',
  properties: leagueProperties,
  required: ['id', 'name', 'location_id', 'start_date', 'end_date', 'max_teams', 'status']
};

const createLeagueSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    location_id: { type: 'string', format: 'uuid' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    description: { type: 'string' },
    max_teams: { type: 'integer', minimum: 1 },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['active', 'completed', 'pending'] }
  },
  required: ['name', 'location_id', 'start_date', 'end_date', 'max_teams']
};

const updateLeagueSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['active', 'completed', 'pending'] },
    max_teams: { type: 'integer', minimum: 1 },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    }
  }
};

interface CreateLeagueBody {
  name: string;
  location_id: string;
  start_date: string;
  end_date: string;
  description?: string;
  max_teams: number;
  simulator_settings?: Record<string, any>;
  status: 'active' | 'completed' | 'pending';
}

interface UpdateLeagueBody {
  name?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  status?: 'active' | 'completed' | 'pending';
  max_teams?: number;
  simulator_settings?: Record<string, any>;
}

export async function leagueRoutes(fastify: FastifyInstance) {
  // Get all leagues
  fastify.get('/', {
    schema: {
      description: 'Get all leagues',
      tags: ['leagues'],
      response: {
        200: {
          type: 'array',
          items: leagueSchema
        }
      }
    }
  }, async () => {
    return await db.selectFrom('leagues')
      .selectAll()
      .execute();
  });

  // Get leagues the current user is participating in
  fastify.get('/my', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      // Find leagues through team membership
      const leagues = await db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .select([
          'leagues.id',
          'leagues.name',
          'leagues.start_date',
          'leagues.end_date',
          'leagues.status',
          'locations.name as location_name',
          'teams.id as team_id',
          'teams.name as team_name'
        ])
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .execute();
      
      return leagues;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get league standings
  fastify.get('/:id/standings', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    try {
      // Check if league exists
      const league = await db.selectFrom('leagues')
        .select(['id', 'name', 'status'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Get teams and calculate their standings
      const standings = await db.selectFrom('teams')
        .leftJoin('matches as home_matches', join => 
          join.on('teams.id', '=', 'home_matches.home_team_id')
              .on('home_matches.league_id', '=', id)
        )
        .leftJoin('matches as away_matches', join => 
          join.on('teams.id', '=', 'away_matches.away_team_id')
              .on('away_matches.league_id', '=', id)
        )
        .select([
          'teams.id',
          'teams.name',
          sql<number>`COUNT(DISTINCT CASE WHEN home_matches.status = 'completed' OR away_matches.status = 'completed' THEN
            CASE WHEN home_matches.id IS NOT NULL THEN home_matches.id ELSE away_matches.id END
            ELSE NULL END)`.as('matches_played'),
          sql<number>`COUNT(DISTINCT CASE 
            WHEN home_matches.status = 'completed' AND home_matches.home_team_score > home_matches.away_team_score THEN home_matches.id
            WHEN away_matches.status = 'completed' AND away_matches.away_team_score > away_matches.home_team_score THEN away_matches.id
            ELSE NULL END)`.as('matches_won'),
          sql<number>`COALESCE(SUM(CASE 
            WHEN home_matches.status = 'completed' THEN home_matches.home_team_score
            ELSE 0 END), 0) + COALESCE(SUM(CASE 
            WHEN away_matches.status = 'completed' THEN away_matches.away_team_score
            ELSE 0 END), 0)`.as('games_won'),
          sql<number>`COALESCE(SUM(CASE 
            WHEN home_matches.status = 'completed' THEN home_matches.home_team_score + home_matches.away_team_score
            WHEN away_matches.status = 'completed' THEN away_matches.home_team_score + away_matches.away_team_score
            ELSE 0 END), 0)`.as('games_played')
        ])
        .where('teams.league_id', '=', id)
        .groupBy(['teams.id', 'teams.name'])
        .orderBy(sql`matches_won DESC, games_won DESC`)
        .execute();
      
      return {
        league,
        standings: standings.map((team: any) => ({
          ...team,
          win_percentage: team.matches_played > 0 
            ? Math.round((team.matches_won / team.matches_played) * 100) 
            : 0,
          game_win_percentage: team.games_played > 0 
            ? Math.round((team.games_won / team.games_played) * 100) 
            : 0
        }))
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get league members (players)
  fastify.get('/:id/members', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    try {
      // Check if league exists
      const league = await db.selectFrom('leagues')
        .select(['id', 'name'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }
      
      // Get all teams and their members
      const members = await db.selectFrom('teams')
        .innerJoin('team_members', 'team_members.team_id', 'teams.id')
        .innerJoin('users', 'users.id', 'team_members.user_id')
        .select([
          'teams.id as team_id',
          'teams.name as team_name',
          'users.id as user_id',
          'users.username',
          'team_members.role as member_role'
        ])
        .where('teams.league_id', '=', id)
        .where('team_members.status', '=', 'active')
        .orderBy(['teams.name', 'users.username'])
        .execute();
      
      // Group by teams
      interface TeamMember {
        user_id: string;
        username: string;
        role: string;
      }
      
      interface TeamWithMembers {
        team_id: string;
        team_name: string;
        members: TeamMember[];
      }
      
      const teamMembers: Record<string, TeamWithMembers> = {};
      
      members.forEach(member => {
        const teamId = member.team_id;
        if (!teamMembers[teamId]) {
          teamMembers[teamId] = {
            team_id: teamId,
            team_name: member.team_name,
            members: []
          };
        }
        
        teamMembers[teamId].members.push({
          user_id: member.user_id,
          username: member.username,
          role: member.member_role
        });
      });
      
      return {
        league,
        teams: Object.values(teamMembers)
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get league by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get a league by ID',
      tags: ['leagues'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: leagueSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const league = await db.selectFrom('leagues')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    if (!league) {
      reply.code(404).send({ error: 'League not found' });
      return;
    }
    
    return league;
  });

  // Create new league (managers only)
  fastify.post<{ Body: CreateLeagueBody }>('/', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Create a new league',
      tags: ['leagues'],
      security: [{ bearerAuth: [] }],
      body: createLeagueSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Verify location exists and manager has access
      const location = await db.selectFrom('locations')
        .select('manager_id')
        .where('id', '=', request.body.location_id)
        .executeTakeFirst();

      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }

      // Check if user is the manager of this location
      const manager = await db.selectFrom('managers')
        .select('id')
        .where('user_id', '=', request.user.id.toString())
        .executeTakeFirst();

      if (!manager) {
        reply.code(403).send({ error: 'You are not authorized to create leagues at this location' });
        return;
      }

      // Generate a UUID for the new league
      const leagueId = uuidv4();
      
      // Create the league
      await db.insertInto('leagues')
        .values({
          id: leagueId,
          name: request.body.name,
          location_id: request.body.location_id,
          start_date: new Date(request.body.start_date),
          end_date: new Date(request.body.end_date),
          max_teams: request.body.max_teams,
          status: (request.body.status || 'pending') as LeagueStatus,
          simulator_settings: request.body.simulator_settings ? JSON.stringify(request.body.simulator_settings) as any : null
        })
        .execute();

      reply.code(201).send({
        message: 'League created successfully',
        id: leagueId
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update league (managers only)
  fastify.put<{ Params: { id: string }; Body: UpdateLeagueBody }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Update a league',
      tags: ['leagues'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: updateLeagueSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      // Verify league exists and manager has access
      const league = await db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('leagues.id', '=', id)
        .executeTakeFirst();

      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }

      if (league.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to update this league' });
        return;
      }

      // Prepare update data with correct types
      const updateData: Record<string, any> = {};
      
      if (request.body.name) updateData.name = request.body.name;
      if (request.body.max_teams) updateData.max_teams = request.body.max_teams;
      if (request.body.start_date) updateData.start_date = new Date(request.body.start_date);
      if (request.body.end_date) updateData.end_date = new Date(request.body.end_date);
      if (request.body.status) updateData.status = request.body.status;
      if (request.body.simulator_settings !== undefined) {
        updateData.simulator_settings = request.body.simulator_settings ? 
          JSON.stringify(request.body.simulator_settings) : 
          null;
      }
      
      // Update the league
      await db.updateTable('leagues')
        .set(updateData)
        .where('id', '=', id)
        .execute();

      reply.send({ message: 'League updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete league (managers only)
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: checkRole(['manager']),
    schema: {
      description: 'Delete a league',
      tags: ['leagues'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      // Verify league exists and manager has access
      const league = await db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('leagues.id', '=', id)
        .executeTakeFirst();

      if (!league) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }

      if (league.user_id.toString() !== request.user.id.toString()) {
        reply.code(403).send({ error: 'You are not authorized to delete this league' });
        return;
      }

      // Delete the league
      await db.deleteFrom('leagues')
        .where('id', '=', id)
        .execute();

      reply.send({ message: 'League deleted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 