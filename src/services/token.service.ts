import { Kysely } from 'kysely';
import jwt from 'jsonwebtoken';
import { Database } from '../types/database';
import { JWTPayload } from '../types/auth';
import { config } from '../utils/config';

/**
 * Centralized token service for generating Rich JWTs with all entity-scoped roles.
 * The JWT contains the user's role in every location, league, and team they belong to,
 * eliminating the need for DB queries during authorization checks.
 */
export class TokenService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Generate a Rich JWT containing all entity-scoped roles for the user.
   */
  async generateToken(userId: string): Promise<{ token: string; payload: JWTPayload }> {
    // Get user info
    const user = await this.db.selectFrom('users')
      .select(['id', 'username', 'email', 'role'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new Error('User not found');
    }

    // Query all entity-scoped roles in parallel
    const [locationRoles, leagueRoles, teamRoles] = await Promise.all([
      this.getLocationRoles(userId),
      this.getLeagueRoles(userId),
      this.getTeamRoles(userId),
    ]);

    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      platform_role: user.role,
      locations: locationRoles,
      leagues: leagueRoles,
      teams: teamRoles,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

    return { token, payload };
  }

  /**
   * Get location roles: { locationId: 'owner' } for all locations the user owns.
   */
  private async getLocationRoles(userId: string): Promise<Record<string, string>> {
    const results = await this.db.selectFrom('owners')
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
  private async getLeagueRoles(userId: string): Promise<Record<string, string>> {
    const results = await this.db.selectFrom('league_members')
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
  private async getTeamRoles(userId: string): Promise<Record<string, string>> {
    const results = await this.db.selectFrom('team_members')
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
}
