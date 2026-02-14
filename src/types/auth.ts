export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  platform_role: string;
  locations: Record<string, string>;  // { locationId: 'owner' }
  leagues: Record<string, string>;    // { leagueId: 'manager' | 'player' | 'spectator' }
  teams: Record<string, string>;      // { teamId: 'captain' | 'member' }
  subscription_tier?: string;         // 'free' | 'starter' | 'pro' | 'enterprise'
  subscription_status?: string;       // 'active' | 'past_due' | 'cancelled' | 'trialing'
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}
