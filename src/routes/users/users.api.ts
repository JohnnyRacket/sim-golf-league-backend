import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { sql } from 'kysely';

export async function userRoutes(fastify: FastifyInstance) {
  // Get all users (admin/manager only)
  fastify.get('/', {
    preHandler: checkRole(['manager'])
  }, async (request, reply) => {
    try {
      return await db.selectFrom('users')
        .select(['id', 'username', 'email', 'created_at', 'updated_at'])
        .execute();
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user by ID (admin/manager or self only)
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    try {
      // Check if user is requesting their own data or is a manager
      if (request.user.id.toString() !== id && !request.user.roles.includes('manager')) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      const user = await db.selectFrom('users')
        .select(['id', 'username', 'email', 'created_at', 'updated_at'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!user) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      
      return user;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user profile (self)
  fastify.get('/me', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      const user = await db.selectFrom('users')
        .select(['id', 'username', 'email', 'role', 'created_at', 'updated_at'])
        .where('id', '=', userId)
        .executeTakeFirst();
      
      if (!user) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      
      // Check if user is a manager
      const manager = await db.selectFrom('managers')
        .select(['id', 'name'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
      
      return {
        ...user,
        is_manager: !!manager,
        manager_details: manager || null
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user dashboard data
  fastify.get('/me/dashboard', async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      // Get user's teams
      const teams = await db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .select([
          'teams.id as team_id',
          'teams.name as team_name',
          'team_members.role as member_role',
          'leagues.id as league_id',
          'leagues.name as league_name',
          'leagues.status as league_status'
        ])
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .execute();
      
      // Get upcoming matches
      const upcomingMatches = await db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .leftJoin('team_members', eb => 
          eb.on(eb2 => eb2.or([
            eb2('team_members.team_id', '=', eb2.ref('home_team.id')),
            eb2('team_members.team_id', '=', eb2.ref('away_team.id'))
          ]))
        )
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name'
        ])
        .where('team_members.user_id', '=', userId)
        .where('matches.status', '=', 'scheduled')
        .where('matches.match_date', '>', new Date())
        .orderBy('matches.match_date', 'asc')
        .limit(5)
        .execute();
      
      // Get recent match results
      const recentMatches = await db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .leftJoin('team_members', eb => 
          eb.on(eb2 => eb2.or([
            eb2('team_members.team_id', '=', eb2.ref('home_team.id')),
            eb2('team_members.team_id', '=', eb2.ref('away_team.id'))
          ]))
        )
        .leftJoin('match_games', 'match_games.match_id', 'matches.id')
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name',
          sql<number>`SUM(CASE WHEN match_games.home_score > match_games.away_score THEN 1 ELSE 0 END)`.as('home_games_won'),
          sql<number>`SUM(CASE WHEN match_games.away_score > match_games.home_score THEN 1 ELSE 0 END)`.as('away_games_won')
        ])
        .where('team_members.user_id', '=', userId)
        .where('matches.status', '=', 'completed')
        .groupBy([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id',
          'home_team.name',
          'away_team.id',
          'away_team.name'
        ])
        .orderBy('matches.match_date', 'desc')
        .limit(5)
        .execute();
      
      // Get player stats summary
      const stats = await db.selectFrom('stats')
        .select([
          'matches_played',
          'matches_won',
          'average_score',
          'handicap'
        ])
        .where('user_id', '=', userId)
        .executeTakeFirst() || { 
          matches_played: 0, 
          matches_won: 0, 
          average_score: 0, 
          handicap: 0 
        };
      
      return {
        teams,
        upcomingMatches,
        recentMatches,
        stats
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user (self only)
  fastify.put('/:id', async (request: FastifyRequest<{
    Params: { id: string },
    Body: { username?: string, email?: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;

    try {
      // Users can only update their own data
      if (request.user.id.toString() !== id) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      const updateData = request.body;
      
      const result = await db.updateTable('users')
        .set(updateData)
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result || result.numUpdatedRows === BigInt(0)) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }

      return { message: 'User updated successfully' };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 