import { db } from '../db';

export interface EntityRoles {
  locations: Record<string, string>;
  leagues: Record<string, string>;
  teams: Record<string, string>;
  subscription_tier?: string;
  subscription_status?: string;
}

/**
 * Get location roles: { locationId: 'owner' } for all locations the user owns.
 */
async function getLocationRoles(userId: string): Promise<Record<string, string>> {
  const results = await db.selectFrom('owners')
    .innerJoin('locations', 'locations.owner_id', 'owners.id')
    .select(['locations.id as location_id'])
    .where('owners.user_id', '=', userId)
    .execute();

  const roles: Record<string, string> = {};
  for (const row of results) {
    roles[row.location_id] = 'owner';
  }
  return roles;
}

/**
 * Get league roles: { leagueId: role } for all leagues the user is a member of.
 */
async function getLeagueRoles(userId: string): Promise<Record<string, string>> {
  const results = await db.selectFrom('league_members')
    .select(['league_id', 'role'])
    .where('user_id', '=', userId)
    .execute();

  const roles: Record<string, string> = {};
  for (const row of results) {
    roles[row.league_id] = row.role;
  }
  return roles;
}

/**
 * Get team roles: { teamId: role } for all teams the user is an active member of.
 */
async function getTeamRoles(userId: string): Promise<Record<string, string>> {
  const results = await db.selectFrom('team_members')
    .select(['team_id', 'role'])
    .where('user_id', '=', userId)
    .where('status', '=', 'active')
    .execute();

  const roles: Record<string, string> = {};
  for (const row of results) {
    roles[row.team_id] = row.role;
  }
  return roles;
}

/**
 * Get subscription information for a user.
 * Returns subscription_tier and subscription_status if user is an owner.
 */
async function getSubscription(userId: string): Promise<{
  subscription_tier?: string;
  subscription_status?: string;
}> {
  const owner = await db.selectFrom('owners')
    .select(['subscription_tier', 'subscription_status'])
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!owner) {
    return {};
  }

  return {
    subscription_tier: owner.subscription_tier,
    subscription_status: owner.subscription_status,
  };
}

/**
 * Build all entity-scoped roles for a user in parallel.
 * Used by better-auth's JWT definePayload and by token refresh.
 */
export async function buildEntityRoles(userId: string): Promise<EntityRoles> {
  const [locations, leagues, teams, subscription] = await Promise.all([
    getLocationRoles(userId),
    getLeagueRoles(userId),
    getTeamRoles(userId),
    getSubscription(userId),
  ]);

  return {
    locations,
    leagues,
    teams,
    subscription_tier: subscription.subscription_tier,
    subscription_status: subscription.subscription_status,
  };
}
