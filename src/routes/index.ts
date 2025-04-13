import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth/auth.api';
import { userRoutes } from './users/users.api';
import { leagueRoutes } from './leagues/leagues.api';
import { matchHistoryRoutes } from './match-history/match-history.api';
import { authenticate } from '../middleware/auth';

export async function registerRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.register(authRoutes, { prefix: '/auth' });

  // Protected routes
  fastify.addHook('onRequest', authenticate);
  
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Register entity routes
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(leagueRoutes, { prefix: '/leagues' });
  fastify.register(matchHistoryRoutes, { prefix: '/match-history' });
} 