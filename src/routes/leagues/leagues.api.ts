import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';

interface CreateLeagueBody {
  name: string;
  location_id: number;
  start_date: string;
  end_date: string;
  max_teams: number;
  status: 'active' | 'completed' | 'cancelled';
}

interface UpdateLeagueBody {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'completed' | 'cancelled';
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
      .where('id', '=', parseInt(id))
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
    const leagueData = {
      ...request.body,
      start_date: new Date(request.body.start_date),
      end_date: new Date(request.body.end_date),
      status: request.body.status || 'active'
    };

    // Verify location exists and manager has access
    const location = await db.selectFrom('locations')
      .select('manager_id')
      .where('id', '=', leagueData.location_id)
      .executeTakeFirst();

    if (!location) {
      reply.code(404).send({ error: 'Location not found' });
      return;
    }

    // Check if user is the manager of this location
    const manager = await db.selectFrom('managers')
      .select('id')
      .where('user_id', '=', request.user.id)
      .where('id', '=', location.manager_id)
      .executeTakeFirst();

    if (!manager) {
      reply.code(403).send({ error: 'You are not authorized to create leagues at this location' });
      return;
    }

    const result = await db.insertInto('leagues')
      .values(leagueData)
      .executeTakeFirst();

    return {
      message: 'League created successfully',
      id: result.insertId
    };
  });

  // Update league (managers only)
  fastify.put<{ Params: { id: string }; Body: UpdateLeagueBody }>('/:id', {
    preHandler: checkRole(['manager'])
  }, async (request, reply) => {
    const { id } = request.params;
    const leagueId = parseInt(id);
    const updateData = {
      ...request.body,
      start_date: request.body.start_date ? new Date(request.body.start_date) : undefined,
      end_date: request.body.end_date ? new Date(request.body.end_date) : undefined
    };

    // Verify league exists and manager has access
    const league = await db.selectFrom('leagues')
      .innerJoin('locations', 'locations.id', 'leagues.location_id')
      .innerJoin('managers', 'managers.id', 'locations.manager_id')
      .select('managers.user_id')
      .where('leagues.id', '=', leagueId)
      .executeTakeFirst();

    if (!league) {
      reply.code(404).send({ error: 'League not found' });
      return;
    }

    if (league.user_id !== request.user.id) {
      reply.code(403).send({ error: 'You are not authorized to update this league' });
      return;
    }

    const result = await db.updateTable('leagues')
      .set(updateData)
      .where('id', '=', leagueId)
      .executeTakeFirst();

    if (!result.numUpdatedRows) {
      reply.code(404).send({ error: 'League not found' });
      return;
    }

    return { message: 'League updated successfully' };
  });

  // Delete league (managers only)
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: checkRole(['manager'])
  }, async (request, reply) => {
    const { id } = request.params;
    const leagueId = parseInt(id);

    // Verify league exists and manager has access
    const league = await db.selectFrom('leagues')
      .innerJoin('locations', 'locations.id', 'leagues.location_id')
      .innerJoin('managers', 'managers.id', 'locations.manager_id')
      .select('managers.user_id')
      .where('leagues.id', '=', leagueId)
      .executeTakeFirst();

    if (!league) {
      reply.code(404).send({ error: 'League not found' });
      return;
    }

    if (league.user_id !== request.user.id) {
      reply.code(403).send({ error: 'You are not authorized to delete this league' });
      return;
    }

    const result = await db.deleteFrom('leagues')
      .where('id', '=', leagueId)
      .executeTakeFirst();

    if (!result.numDeletedRows) {
      reply.code(404).send({ error: 'League not found' });
      return;
    }

    return { message: 'League deleted successfully' };
  });
} 