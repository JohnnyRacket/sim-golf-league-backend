import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { getAuth } from '../../auth';

export async function tokenRefreshRoutes(fastify: FastifyInstance) {
  /**
   * Refresh JWT token with current entity-scoped roles
   * Uses better-auth's JWT plugin to regenerate token
   * The definePayload callback will fetch fresh roles via buildEntityRoles()
   */
  fastify.post('/token/refresh', {
    preHandler: [authenticate],
    schema: {
      description: 'Refresh JWT with current entity-scoped roles',
      tags: ['authentication'],
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const auth = await getAuth();

      // Use better-auth JWT API to generate fresh token
      // definePayload will call buildEntityRoles() automatically
      const result = await auth.api.getToken({
        headers: request.headers as any,
      });

      if (!result?.token) {
        return reply.status(401).send({ error: 'Failed to generate token' });
      }

      return { token: result.token };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to refresh token' });
    }
  });
}
