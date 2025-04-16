import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth/auth.api';
import { userRoutes } from './users/users.api';
import { leagueRoutes } from './leagues/leagues.api';
import { teamRoutes } from './teams/teams.api';
import { locationRoutes } from './locations/locations.api';
import { matchRoutes } from './matches/matches.api';
import { notificationRoutes } from './notifications/notifications.api';
import { matchResultRoutes } from './match-results/match-results.api';
import { authenticate } from '../middleware/auth';

export async function registerRoutes(fastify: FastifyInstance) {
  // Public routes that don't require authentication
  fastify.register(authRoutes, { prefix: '/auth' });
  
  // Create a scope for protected routes with authentication
  fastify.register(async (protectedRoutes) => {
    // Add authentication middleware to all routes in this scope
    protectedRoutes.addHook('onRequest', authenticate);
    
    // Register protected entity routes
    protectedRoutes.register(userRoutes, { prefix: '/users' });
    protectedRoutes.register(leagueRoutes, { prefix: '/leagues' });
    protectedRoutes.register(teamRoutes, { prefix: '/teams' });
    protectedRoutes.register(matchRoutes, { prefix: '/matches' });
    protectedRoutes.register(locationRoutes, { prefix: '/locations' });
    protectedRoutes.register(notificationRoutes, { prefix: '/notifications' });
    protectedRoutes.register(matchResultRoutes, { prefix: '/match-results' });
  });
} 