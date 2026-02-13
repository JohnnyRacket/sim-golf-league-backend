import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ──────────────────────────────────────────────
  // Foreign-key lookup indexes
  // ──────────────────────────────────────────────

  // owners.user_id — token generation, ownership checks on every auth flow
  await db.schema
    .createIndex('idx_owners_user_id')
    .on('owners')
    .column('user_id')
    .execute();

  // locations.owner_id — owner's locations listing, location count
  await db.schema
    .createIndex('idx_locations_owner_id')
    .on('locations')
    .column('owner_id')
    .execute();

  // leagues.location_id — location's leagues listing, league count checks
  await db.schema
    .createIndex('idx_leagues_location_id')
    .on('leagues')
    .column('location_id')
    .execute();

  // teams.league_id — league team listings, schedule generation
  await db.schema
    .createIndex('idx_teams_league_id')
    .on('teams')
    .column('league_id')
    .execute();

  // ──────────────────────────────────────────────
  // Composite query-pattern indexes
  // ──────────────────────────────────────────────

  // leagues (is_public, status) — public league browsing/search
  await db.schema
    .createIndex('idx_leagues_public_status')
    .on('leagues')
    .columns(['is_public', 'status'])
    .execute();

  // leagues (series_id, status) — series league count queries
  await db.schema
    .createIndex('idx_leagues_series_status')
    .on('leagues')
    .columns(['series_id', 'status'])
    .execute();

  // teams (league_id, status) — filtered active team queries
  await db.schema
    .createIndex('idx_teams_league_status')
    .on('teams')
    .columns(['league_id', 'status'])
    .execute();

  // ──────────────────────────────────────────────
  // league_members indexes
  // ──────────────────────────────────────────────

  // league_members.user_id — "my leagues", manager checks, token gen
  await db.schema
    .createIndex('idx_league_members_user_id')
    .on('league_members')
    .column('user_id')
    .execute();

  // league_members (league_id, role) — manager permission checks
  await db.schema
    .createIndex('idx_league_members_league_role')
    .on('league_members')
    .columns(['league_id', 'role'])
    .execute();

  // ──────────────────────────────────────────────
  // league_membership_requests indexes
  // ──────────────────────────────────────────────

  // (league_id, status) — pending request listings
  await db.schema
    .createIndex('idx_league_membership_requests_league_status')
    .on('league_membership_requests')
    .columns(['league_id', 'status'])
    .execute();

  // user_id — user's own request listings
  await db.schema
    .createIndex('idx_league_membership_requests_user_id')
    .on('league_membership_requests')
    .column('user_id')
    .execute();

  // ──────────────────────────────────────────────
  // team_members indexes
  // ──────────────────────────────────────────────

  // team_members.user_id — "my teams", dashboard, match filtering, token gen
  await db.schema
    .createIndex('idx_team_members_user_id')
    .on('team_members')
    .column('user_id')
    .execute();

  // team_members (team_id, status) — active member counts, member checks
  await db.schema
    .createIndex('idx_team_members_team_status')
    .on('team_members')
    .columns(['team_id', 'status'])
    .execute();

  // ──────────────────────────────────────────────
  // team_join_requests indexes
  // ──────────────────────────────────────────────

  // (team_id, status) — pending join request listings
  await db.schema
    .createIndex('idx_team_join_requests_team_status')
    .on('team_join_requests')
    .columns(['team_id', 'status'])
    .execute();

  // user_id — user's join request listings
  await db.schema
    .createIndex('idx_team_join_requests_user_id')
    .on('team_join_requests')
    .column('user_id')
    .execute();

  // ──────────────────────────────────────────────
  // matches indexes
  // ──────────────────────────────────────────────

  // matches.league_id — match listings, schedule views
  await db.schema
    .createIndex('idx_matches_league_id')
    .on('matches')
    .column('league_id')
    .execute();

  // matches (league_id, status) — filtered match queries
  await db.schema
    .createIndex('idx_matches_league_status')
    .on('matches')
    .columns(['league_id', 'status'])
    .execute();

  // matches (league_id, match_date) — schedule range queries, bulk update by day
  await db.schema
    .createIndex('idx_matches_league_date')
    .on('matches')
    .columns(['league_id', 'match_date'])
    .execute();

  // matches.home_team_id — match filtering by team
  await db.schema
    .createIndex('idx_matches_home_team_id')
    .on('matches')
    .column('home_team_id')
    .execute();

  // matches.away_team_id — match filtering by team
  await db.schema
    .createIndex('idx_matches_away_team_id')
    .on('matches')
    .column('away_team_id')
    .execute();

  // ──────────────────────────────────────────────
  // stats indexes
  // ──────────────────────────────────────────────

  // stats.league_id — standings queries (unique covers team_id+league_id but not league_id alone)
  await db.schema
    .createIndex('idx_stats_league_id')
    .on('stats')
    .column('league_id')
    .execute();

  // ──────────────────────────────────────────────
  // notifications indexes
  // ──────────────────────────────────────────────

  // (user_id, is_read) — unread count, mark-all-read
  await db.schema
    .createIndex('idx_notifications_user_read')
    .on('notifications')
    .columns(['user_id', 'is_read'])
    .execute();

  // (user_id, created_at DESC) — user notification listing with sort
  await db.schema
    .createIndex('idx_notifications_user_created')
    .on('notifications')
    .expression(sql`user_id, created_at DESC`)
    .execute();

  // ──────────────────────────────────────────────
  // communications indexes
  // ──────────────────────────────────────────────

  // (recipient_type, recipient_id) — league communications lookup
  await db.schema
    .createIndex('idx_communications_recipient')
    .on('communications')
    .columns(['recipient_type', 'recipient_id'])
    .execute();

  // ──────────────────────────────────────────────
  // match_result_submissions indexes
  // ──────────────────────────────────────────────

  // match_id — get submissions for a match
  await db.schema
    .createIndex('idx_match_result_submissions_match_id')
    .on('match_result_submissions')
    .column('match_id')
    .execute();

  // ──────────────────────────────────────────────
  // league_invites indexes
  // ──────────────────────────────────────────────

  // (league_id, status) — listing invites per league
  await db.schema
    .createIndex('idx_league_invites_league_status')
    .on('league_invites')
    .columns(['league_id', 'status'])
    .execute();

  // (recipient_email, status, expires_at) — user invite lookup, auto-accept
  await db.schema
    .createIndex('idx_league_invites_recipient_lookup')
    .on('league_invites')
    .columns(['recipient_email', 'status', 'expires_at'])
    .execute();

  // ──────────────────────────────────────────────
  // player_handicaps indexes
  // ──────────────────────────────────────────────

  // (user_id, league_id) — player handicap history lookups
  await db.schema
    .createIndex('idx_player_handicaps_user_league')
    .on('player_handicaps')
    .columns(['user_id', 'league_id'])
    .execute();

  // ──────────────────────────────────────────────
  // password_reset_challenges indexes
  // ──────────────────────────────────────────────

  // (email, challenge_code, used) — reset code verification
  await db.schema
    .createIndex('idx_password_reset_lookup')
    .on('password_reset_challenges')
    .columns(['email', 'challenge_code', 'used'])
    .execute();
}
