import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { LeagueStatus } from '../../types/database';

interface CreateLeagueBody {
  name: string;
  location_id: string;
  start_date: string;
  end_date: string;
  max_teams: number;
  status: 'active' | 'completed' | 'pending';
}

interface UpdateLeagueBody {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'completed' | 'pending';
  max_teams?: number;
}

export async function leagueRoutes(fastify: FastifyInstance) {
  // Get all leagues
  fastify.get('/', async () => {
    return await db.selectFrom('leagues')
      .selectAll()
      .execute();
  });

  // Get league by ID
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
    preHandler: checkRole(['manager'])
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
          status: (request.body.status || 'pending') as LeagueStatus
        })
        .execute();

      return {
        message: 'League created successfully',
        id: leagueId
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update league (managers only)
  fastify.put<{ Params: { id: string }; Body: UpdateLeagueBody }>('/:id', {
    preHandler: checkRole(['manager'])
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
      if (request.body.status) updateData.status = request.body.status as LeagueStatus;

      const result = await db.updateTable('leagues')
        .set(updateData)
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result || result.numUpdatedRows === BigInt(0)) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }

      return { message: 'League updated successfully' };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete league (managers only)
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: checkRole(['manager'])
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

      const result = await db.deleteFrom('leagues')
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result || result.numDeletedRows === BigInt(0)) {
        reply.code(404).send({ error: 'League not found' });
        return;
      }

      return { message: 'League deleted successfully' };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 