import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { AuthService } from './auth.service';
import { authenticate } from '../../middleware/auth';
import {
  LoginBody,
  RegisterBody,
  RequestPasswordResetBody,
  VerifyPasswordResetBody,
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  verifyPasswordResetSchema,
  tokenResponseSchema,
  errorResponseSchema,
  successResponseSchema
} from './auth.types';

export async function authRoutes(fastify: FastifyInstance) {
  // Initialize Auth Service
  const authService = new AuthService(db);

  // Login route
  fastify.post<{ Body: LoginBody }>('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    schema: {
      description: 'Login with email and password',
      tags: ['authentication'],
      body: loginSchema,
      response: {
        200: tokenResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    try {
      // Authenticate user
      const authResult = await authService.loginUser(email, password);
      
      if (!authResult) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      return authResult;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Register route
  fastify.post<{ Body: RegisterBody }>('/register', {
    schema: {
      description: 'Register a new user account',
      tags: ['authentication'],
      body: registerSchema,
      response: {
        200: tokenResponseSchema,
        400: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { username, email, password } = request.body;

    try {
      // Register new user
      const authResult = await authService.registerUser(username, email, password);
      
      if (!authResult) {
        return reply.status(400).send({ 
          error: 'Username or email already exists' 
        });
      }

      return authResult;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Request password reset route
  fastify.post<{ Body: RequestPasswordResetBody }>('/reset-password', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute'
      }
    },
    schema: {
      description: 'Request a password reset challenge',
      tags: ['authentication'],
      body: requestPasswordResetSchema,
      response: {
        200: successResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { email } = request.body;

    try {
      const result = await authService.createPasswordResetChallenge(email);
      
      // Always return success even if email not found (security best practice)
      return reply.status(200).send({ 
        success: true, 
        message: 'If your email is registered, you will receive a password reset code shortly' 
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Verify password reset and set new password
  fastify.post<{ Body: VerifyPasswordResetBody }>('/reset-password/verify', {
    schema: {
      description: 'Verify password reset challenge and set new password',
      tags: ['authentication'],
      body: verifyPasswordResetSchema,
      response: {
        200: successResponseSchema,
        400: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { email, challengeCode, newPassword } = request.body;

    try {
      const result = await authService.verifyAndResetPassword(email, challengeCode, newPassword);

      if (!result.success) {
        return reply.status(400).send({
          error: result.message || 'Invalid or expired reset code'
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Refresh token - returns a new JWT with current entity-scoped roles
  fastify.post('/refresh', {
    preHandler: [authenticate],
    schema: {
      description: 'Refresh JWT token with current roles',
      tags: ['authentication'],
      response: {
        200: tokenResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const authResult = await authService.refreshToken(request.user.id);

      if (!authResult) {
        return reply.status(401).send({ error: 'User not found' });
      }

      return authResult;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
} 