import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database, HandicapMode } from '../../types/database';
import { DatabaseError, NotFoundError, ValidationError } from '../../utils/errors';

export class HandicapsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all current player handicaps for a league
   */
  async getLeagueHandicaps(leagueId: string) {
    // Get the most recent handicap for each user in the league
    const handicaps = await this.db.selectFrom('player_handicaps')
      .innerJoin('users', 'users.id', 'player_handicaps.user_id')
      .select([
        'player_handicaps.id',
        'player_handicaps.user_id',
        'users.username',
        'player_handicaps.handicap_index',
        'player_handicaps.effective_date',
        'player_handicaps.updated_at',
      ])
      .where('player_handicaps.league_id', '=', leagueId)
      .orderBy('users.username', 'asc')
      .execute();

    // Deduplicate: keep only the most recent per user
    const latestByUser = new Map<string, typeof handicaps[number]>();
    for (const h of handicaps) {
      const existing = latestByUser.get(h.user_id);
      if (!existing || h.effective_date > existing.effective_date) {
        latestByUser.set(h.user_id, h);
      }
    }

    return Array.from(latestByUser.values());
  }

  /**
   * Set or update a player's handicap in a league
   */
  async setPlayerHandicap(data: {
    userId: string;
    leagueId: string;
    handicapIndex: number;
    effectiveDate?: Date;
  }) {
    const { userId, leagueId, handicapIndex, effectiveDate } = data;
    const date = effectiveDate || new Date();

    // Validate handicap range (typically -10 to 54)
    if (handicapIndex < -10 || handicapIndex > 54) {
      throw new ValidationError('Handicap index must be between -10 and 54');
    }

    // Check if record exists for this user/league/date
    const existing = await this.db.selectFrom('player_handicaps')
      .select('id')
      .where('user_id', '=', userId)
      .where('league_id', '=', leagueId)
      .where('effective_date', '=', date)
      .executeTakeFirst();

    if (existing) {
      await this.db.updateTable('player_handicaps')
        .set({ handicap_index: handicapIndex })
        .where('id', '=', existing.id)
        .execute();
      return { id: existing.id, updated: true };
    }

    const id = uuidv4();
    await this.db.insertInto('player_handicaps')
      .values({
        id,
        user_id: userId,
        league_id: leagueId,
        handicap_index: handicapIndex,
        effective_date: date,
      })
      .execute();

    // If league is in auto mode, recalculate team handicaps
    await this.autoRecalculateTeamHandicaps(leagueId);

    return { id, updated: false };
  }

  /**
   * Get a specific player's handicap history in a league
   */
  async getPlayerHandicapHistory(userId: string, leagueId: string) {
    return this.db.selectFrom('player_handicaps')
      .select(['id', 'handicap_index', 'effective_date', 'created_at'])
      .where('user_id', '=', userId)
      .where('league_id', '=', leagueId)
      .orderBy('effective_date', 'desc')
      .execute();
  }

  /**
   * Get a team's handicap (manual or auto-calculated)
   */
  async getTeamHandicap(teamId: string) {
    const team = await this.db.selectFrom('teams')
      .innerJoin('leagues', 'leagues.id', 'teams.league_id')
      .select([
        'teams.id',
        'teams.name',
        'teams.team_handicap',
        'teams.league_id',
        'leagues.handicap_mode',
      ])
      .where('teams.id', '=', teamId)
      .executeTakeFirst();

    if (!team) {
      throw new NotFoundError('Team');
    }

    return {
      team_id: team.id,
      team_name: team.name,
      team_handicap: team.team_handicap,
      handicap_mode: team.handicap_mode,
    };
  }

  /**
   * Manually set a team's handicap (only when league mode is 'manual')
   */
  async setTeamHandicap(teamId: string, handicap: number) {
    const team = await this.db.selectFrom('teams')
      .innerJoin('leagues', 'leagues.id', 'teams.league_id')
      .select(['teams.id', 'leagues.handicap_mode'])
      .where('teams.id', '=', teamId)
      .executeTakeFirst();

    if (!team) {
      throw new NotFoundError('Team');
    }

    if (team.handicap_mode === 'auto') {
      throw new ValidationError('Cannot manually set handicap when league is in auto mode');
    }

    await this.db.updateTable('teams')
      .set({ team_handicap: handicap })
      .where('id', '=', teamId)
      .execute();

    return true;
  }

  /**
   * Auto-recalculate team handicaps for a league (when mode is 'auto')
   */
  async autoRecalculateTeamHandicaps(leagueId: string) {
    const league = await this.db.selectFrom('leagues')
      .select(['id', 'handicap_mode'])
      .where('id', '=', leagueId)
      .executeTakeFirst();

    if (!league || league.handicap_mode !== 'auto') {
      return;
    }

    // Get all teams in the league
    const teams = await this.db.selectFrom('teams')
      .select('id')
      .where('league_id', '=', leagueId)
      .where('status', '=', 'active')
      .execute();

    for (const team of teams) {
      // Get active team members
      const members = await this.db.selectFrom('team_members')
        .select('user_id')
        .where('team_id', '=', team.id)
        .where('status', '=', 'active')
        .execute();

      if (members.length === 0) {
        await this.db.updateTable('teams')
          .set({ team_handicap: null })
          .where('id', '=', team.id)
          .execute();
        continue;
      }

      // Get latest handicap for each member
      let totalHandicap = 0;
      let memberCount = 0;

      for (const member of members) {
        const handicap = await this.db.selectFrom('player_handicaps')
          .select('handicap_index')
          .where('user_id', '=', member.user_id)
          .where('league_id', '=', leagueId)
          .orderBy('effective_date', 'desc')
          .executeTakeFirst();

        if (handicap) {
          totalHandicap += Number(handicap.handicap_index);
          memberCount++;
        }
      }

      const avgHandicap = memberCount > 0
        ? Math.round((totalHandicap / memberCount) * 10) / 10
        : null;

      await this.db.updateTable('teams')
        .set({ team_handicap: avgHandicap })
        .where('id', '=', team.id)
        .execute();
    }
  }
}
