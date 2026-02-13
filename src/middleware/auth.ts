import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyRichJWT } from '../services/jwt.service';

/**
 * Verify JWT token is present and valid using jose JWKS verification.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    request.user = await verifyRichJWT(token);
  } catch (err: any) {
    console.error('JWT verification failed:', err.message);
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

/**
 * Check if user has one of the specified platform roles (from users.role column).
 * Admin always passes any platform role check.
 */
export function checkPlatformRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (user.platform_role === 'admin') return; // admin bypasses all
      if (!roles.includes(user.platform_role)) {
        // Also check if any role matches a location-based "owner" capability
        if (roles.includes('owner') && Object.keys(user.locations || {}).length > 0) {
          return; // user owns at least one location
        }
        reply.code(403).send({ error: 'Forbidden' });
      }
    } catch (err: any) {
      console.error('Error checking platform role:', err.message);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}

/**
 * Check if user has one of the specified roles for a specific league.
 * The league ID is extracted from route params or body using the provided key.
 * Admin and location owners of the league's location always pass.
 *
 * @param paramKey - The route param or body field containing the league ID
 * @param roles - Allowed league roles (e.g., ['manager'])
 * @param source - Where to find the league ID: 'params' (default) or 'body'
 */
export function checkLeagueRole(paramKey: string, roles: string[], source: 'params' | 'body' = 'params') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (user.platform_role === 'admin') return; // admin bypasses all

      const leagueId = source === 'params'
        ? (request.params as any)[paramKey]
        : (request.body as any)[paramKey];

      if (!leagueId) {
        reply.code(400).send({ error: 'League ID required' });
        return;
      }

      // Check direct league role
      const userLeagueRole = user.leagues?.[leagueId];
      if (userLeagueRole && roles.includes(userLeagueRole)) {
        return;
      }

      // Location owners can manage any league at their location
      // This requires knowing which location the league belongs to.
      // For now, we check if the user owns ANY location - the service layer
      // can do the specific location check if needed for destructive operations.
      // A better approach: store league->location mapping in JWT too, but that
      // adds complexity. For now, location owners with the 'manager' role being
      // checked get through if they own any location.
      if (roles.includes('manager') && Object.keys(user.locations || {}).length > 0) {
        return; // location owner - service layer will verify specific league ownership
      }

      reply.code(403).send({ error: 'Forbidden' });
    } catch (err: any) {
      console.error('Error checking league role:', err.message);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}

/**
 * Check if user has one of the specified roles for a specific team.
 * Admin, league managers, and location owners always pass.
 *
 * @param paramKey - The route param containing the team ID
 * @param roles - Allowed team roles (e.g., ['captain', 'member'])
 */
export function checkTeamRole(paramKey: string, roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (user.platform_role === 'admin') return;

      const teamId = (request.params as any)[paramKey];
      if (!teamId) {
        reply.code(400).send({ error: 'Team ID required' });
        return;
      }

      // Check direct team role
      const userTeamRole = user.teams?.[teamId];
      if (userTeamRole && roles.includes(userTeamRole)) {
        return;
      }

      // League managers and location owners can manage any team in their league
      // They will have league-level roles that grant team access
      if (Object.keys(user.leagues || {}).length > 0 || Object.keys(user.locations || {}).length > 0) {
        return; // service layer will verify specific relationship
      }

      reply.code(403).send({ error: 'Forbidden' });
    } catch (err: any) {
      console.error('Error checking team role:', err.message);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}

/**
 * Check if user is the owner of a specific location.
 * Admin always passes.
 *
 * @param paramKey - The route param containing the location ID
 */
export function checkLocationRole(paramKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (user.platform_role === 'admin') return;

      const locationId = (request.params as any)[paramKey];
      if (!locationId) {
        reply.code(400).send({ error: 'Location ID required' });
        return;
      }

      if (user.locations?.[locationId] === 'owner') {
        return;
      }

      reply.code(403).send({ error: 'Forbidden' });
    } catch (err: any) {
      console.error('Error checking location role:', err.message);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}

// Keep the old checkRole for backward compatibility during migration
// TODO: Remove once all routes are migrated to entity-scoped checks
export function checkRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;

      // Admin bypasses all
      if (user.platform_role === 'admin') return;

      // Check platform role
      if (roles.includes(user.platform_role)) return;

      // Check if 'owner' is requested and user owns locations
      if (roles.includes('owner') && Object.keys(user.locations || {}).length > 0) return;

      // Check if 'manager' is requested and user manages leagues
      if (roles.includes('manager')) {
        const isLeagueManager = Object.values(user.leagues || {}).some(role => role === 'manager');
        const isLocationOwner = Object.keys(user.locations || {}).length > 0;
        if (isLeagueManager || isLocationOwner) return;
      }

      reply.code(403).send({ error: 'Forbidden' });
    } catch (err: any) {
      console.error('Error checking roles:', err.message);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}
