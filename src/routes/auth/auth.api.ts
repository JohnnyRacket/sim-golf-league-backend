import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { AuthService } from './auth.service';
import { 
  LoginBody, 
  RegisterBody, 
  loginSchema, 
  registerSchema, 
  tokenResponseSchema, 
  errorResponseSchema 
} from './auth.types';

export async function authRoutes(fastify: FastifyInstance) {
  // Initialize Auth Service
  const authService = new AuthService(db);

  // Login route
  fastify.post<{ Body: LoginBody }>('/login', {
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
} 