import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import bcrypt from 'bcrypt';
import { SignJWT, importJWK } from 'jose';
import { buildEntityRoles } from '../../services/role-builder';
import { config } from '../../utils/config';
import { v4 as uuidv4 } from 'uuid';

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
        subscription_tier: roles.subscription_tier,
        subscription_status: roles.subscription_status,
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

  /**
   * Register endpoint that creates user and returns JWT directly (for test compatibility)
   */
  fastify.post('/register', {
    schema: {
      description: 'Register new user (compat)',
      tags: ['authentication'],
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string' },
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
                email: { type: 'string' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { username, email, password } = request.body as {
      username: string;
      email: string;
      password: string;
    };

    try {
      // Check if user already exists
      const existingUser = await db
        .selectFrom('users')
        .select(['id'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Create user
      const userId = uuidv4();
      await db
        .insertInto('users')
        .values({
          id: userId,
          username,
          email,
          password_hash: '', // Legacy field, not used
          role: 'user',
        })
        .execute();

      // Create account with hashed password
      const hashedPassword = await bcrypt.hash(password, 10);
      await db
        .insertInto('account')
        .values({
          id: uuidv4(),
          user_id: userId,
          account_id: email,
          provider_id: 'credential',
          password: hashedPassword,
        })
        .execute();

      // Get JWKS key for signing
      const jwk = await db
        .selectFrom('jwks')
        .select(['private_key'])
        .orderBy('created_at', 'desc')
        .executeTakeFirstOrThrow();

      const privateKey = await importJWK(JSON.parse(jwk.private_key), 'EdDSA');

      // Build Rich JWT payload
      const roles = await buildEntityRoles(userId);
      const payload = {
        id: userId,
        username,
        email,
        platform_role: 'user',
        locations: roles.locations,
        leagues: roles.leagues,
        teams: roles.teams,
        subscription_tier: roles.subscription_tier,
        subscription_status: roles.subscription_status,
      };

      // Sign JWT
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
          id: userId,
          username,
          email,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
