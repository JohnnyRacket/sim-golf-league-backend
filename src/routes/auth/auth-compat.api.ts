import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import bcrypt from 'bcrypt';
import { SignJWT, importJWK } from 'jose';
import { buildEntityRoles } from '../../services/role-builder';
import { config } from '../../utils/config';

/**
 * Compatibility auth routes for E2E tests
 * These routes provide a simpler authentication flow that returns JWTs directly
 * Uses better-auth JWKS for signing to ensure compatibility
 */
export async function authCompatRoutes(fastify: FastifyInstance) {
  /**
   * Login endpoint that returns JWT directly (for test compatibility)
   */
  fastify.post('/login', {
    schema: {
      description: 'Login with email and password (compat)',
      tags: ['authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
              },
            },
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
    const { email, password } = request.body as { email: string; password: string };

    try {
      // Verify credentials
      const user = await db.selectFrom('users')
        .select(['id', 'username', 'email', 'role'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Check password
      const account = await db.selectFrom('account')
        .select(['password'])
        .where('user_id', '=', user.id)
        .where('provider_id', '=', 'credential')
        .executeTakeFirst();

      if (!account?.password) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, account.password);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Get JWKS key for signing (same keys better-auth uses)
      const jwk = await db
        .selectFrom('jwks')
        .select(['private_key'])
        .orderBy('created_at', 'desc')
        .executeTakeFirstOrThrow();

      const privateKey = await importJWK(JSON.parse(jwk.private_key), 'EdDSA');

      // Build Rich JWT payload with entity-scoped roles
      const roles = await buildEntityRoles(user.id);
      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        platform_role: user.role,
        locations: roles.locations,
        leagues: roles.leagues,
        teams: roles.teams,
      };

      // Sign JWT (same structure as better-auth)
      const token = await new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'EdDSA' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .setIssuer(config.appUrl)
        .setAudience(config.appUrl)
        .sign(privateKey);

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
