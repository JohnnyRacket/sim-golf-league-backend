import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth/auth-routes';
import { userRoutes } from './users/user-management-routes';
import { leagueRoutes } from './leagues/league-management-routes';
import { matchHistoryRoutes } from './match-history/match-history-routes';
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