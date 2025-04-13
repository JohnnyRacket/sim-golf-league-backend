import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';

export async function userRoutes(fastify: FastifyInstance) {
  // Get all users (admin/manager only)
  fastify.get('/', {
    preHandler: checkRole(['manager'])
  }, async () => {
    return await db.selectFrom('users')
      .select(['id', 'username', 'email', 'created_at', 'updated_at'])
      .execute();
  });

  // Get user by ID (admin/manager or self only)
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = parseInt(id);

    // Check if user is requesting their own data or is a manager
    if (request.user.id !== userId && !request.user.roles.includes('manager')) {
      reply.code(403).send({ error: 'Forbidden' });
      return;
    }

    const user = await db.selectFrom('users')
      .select(['id', 'username', 'email', 'created_at', 'updated_at'])
      .where('id', '=', userId)
      .executeTakeFirst();
    
    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }
    
    return user;
  });

  // Update user (self only)
  fastify.put('/:id', async (request: FastifyRequest<{
    Params: { id: string },
    Body: { username?: string, email?: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = parseInt(id);

    // Users can only update their own data
    if (request.user.id !== userId) {
      reply.code(403).send({ error: 'Forbidden' });
      return;
    }

    const updateData = request.body;
    
    const result = await db.updateTable('users')
      .set(updateData)
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!result.numUpdatedRows) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }

    return { message: 'User updated successfully' };
  });
} 