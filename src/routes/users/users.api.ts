import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { UsersService } from './users.service';
import { 
  userProfileSchema,
  updateUserSchema,
  userDashboardSchema,
  UpdateUserBody,
  userListSchema,
  userBasicSchema,
  userIdParamsSchema,
  errorResponseSchema,
  successMessageSchema
} from './users.types';

export async function userRoutes(fastify: FastifyInstance) {
  // Initialize service
  const usersService = new UsersService(db);

  // Get all users (admin/manager only)
  fastify.get('/', {
    preHandler: checkRole(['manager']),
    schema: {
      response: {
        200: userListSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      return await usersService.getAllUsers();
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user profile (self)
  fastify.get('/me', {
    schema: {
      response: {
        200: userProfileSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      
      const profile = await usersService.getCurrentUserProfile(userId);
      
      if (!profile) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      
      return profile;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user dashboard data
  fastify.get('/me/dashboard', {
    schema: {
      response: {
        200: userDashboardSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id.toString();
      return await usersService.getUserDashboard(userId);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user by ID (admin/manager or self only)
  fastify.get('/:id', {
    schema: {
      params: userIdParamsSchema,
      response: {
        200: userBasicSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    try {
      // Check if user is requesting their own data or is a manager
      if (request.user.id.toString() !== id && !request.user.roles.includes('manager')) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      const user = await usersService.getUserById(id);
      
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
  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>('/:id', {
    schema: {
      params: userIdParamsSchema,
      body: updateUserSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      // Users can only update their own data
      if (request.user.id.toString() !== id) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      const updateData = request.body;
      const updated = await usersService.updateUser(id, updateData);

      if (!updated) {
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