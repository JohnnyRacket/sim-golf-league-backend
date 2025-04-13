import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';

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