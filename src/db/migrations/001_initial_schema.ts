import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ──────────────────────────────────────────────
  // Enum types
  // ──────────────────────────────────────────────
  await sql`CREATE TYPE user_role AS ENUM ('user', 'admin')`.execute(db);
  await sql`CREATE TYPE team_member_role AS ENUM ('captain', 'member')`.execute(db);
  await sql`CREATE TYPE team_status AS ENUM ('active', 'inactive')`.execute(db);
  await sql`CREATE TYPE league_status AS ENUM ('pending', 'active', 'completed', 'inactive')`.execute(db);
  await sql`CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled')`.execute(db);
  await sql`CREATE TYPE match_game_status AS ENUM ('pending', 'in_progress', 'completed')`.execute(db);
  await sql`CREATE TYPE recipient_type AS ENUM ('league', 'team', 'user')`.execute(db);
  await sql`CREATE TYPE league_member_role AS ENUM ('player', 'spectator', 'manager')`.execute(db);
  await sql`CREATE TYPE league_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled')`.execute(db);
  await sql`CREATE TYPE notification_type AS ENUM ('league_invite', 'team_invite', 'match_reminder', 'match_result', 'team_join_request', 'league_join_request', 'system_message', 'series_new_league')`.execute(db);
  await sql`CREATE TYPE match_result_status AS ENUM ('pending', 'approved', 'rejected')`.execute(db);
  await sql`CREATE TYPE communication_type AS ENUM ('system', 'league', 'maintenance', 'advertisement', 'schedule')`.execute(db);
  await sql`CREATE TYPE payment_type AS ENUM ('weekly', 'monthly', 'upfront', 'free')`.execute(db);
  await sql`CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`.execute(db);
  await sql`CREATE TYPE handedness_type AS ENUM ('left', 'right', 'both')`.execute(db);
  await sql`CREATE TYPE game_format_type AS ENUM ('scramble', 'best_ball', 'alternate_shot', 'individual')`.execute(db);
  await sql`CREATE TYPE match_format_type AS ENUM ('stroke_play', 'match_play')`.execute(db);
  await sql`CREATE TYPE scoring_format_type AS ENUM ('net', 'gross')`.execute(db);
  await sql`CREATE TYPE scheduling_format_type AS ENUM ('round_robin', 'groups', 'swiss', 'ladder', 'custom')`.execute(db);
  await sql`CREATE TYPE playoff_format_type AS ENUM ('none', 'single_elimination', 'double_elimination', 'round_robin')`.execute(db);
  await sql`CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired')`.execute(db);
  await sql`CREATE TYPE handicap_mode AS ENUM ('none', 'manual', 'auto')`.execute(db);
  await sql`CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise')`.execute(db);
  await sql`CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing')`.execute(db);

  // ──────────────────────────────────────────────
  // Trigger function
  // ──────────────────────────────────────────────
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `.execute(db);

  // ──────────────────────────────────────────────
  // Tables (in dependency order)
  // ──────────────────────────────────────────────

  // users
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('username', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)') // Nullable - better-auth stores passwords in account table
    .addColumn('role', sql`user_role`, (col) => col.notNull().defaultTo('user'))
    .addColumn('first_name', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('phone', 'varchar(20)')
    .addColumn('avatar_url', 'text')
    .addColumn('email_verified', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // owners
  await db.schema
    .createTable('owners')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('subscription_tier', sql`subscription_tier`, (col) => col.notNull().defaultTo('free'))
    .addColumn('subscription_status', sql`subscription_status`, (col) => col.notNull().defaultTo('active'))
    .addColumn('subscription_expires_at', 'timestamptz')
    .addColumn('max_locations', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('max_leagues_per_location', 'integer', (col) => col.notNull().defaultTo(2))
    .addColumn('payment_provider_customer_id', 'varchar(255)')
    .addColumn('payment_provider_subscription_id', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // locations
  await db.schema
    .createTable('locations')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('owner_id', 'uuid', (col) => col.notNull().references('owners.id').onDelete('cascade'))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('address', 'text', (col) => col.notNull())
    .addColumn('logo_url', 'text')
    .addColumn('banner_url', 'text')
    .addColumn('website_url', 'text')
    .addColumn('phone', 'varchar(50)')
    .addColumn('coordinates', sql`point`)
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // bays
  await db.schema
    .createTable('bays')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('location_id', 'uuid', (col) => col.notNull().references('locations.id').onDelete('cascade'))
    .addColumn('bay_number', 'varchar(20)', (col) => col.notNull())
    .addColumn('max_people', 'integer', (col) => col.notNull().defaultTo(4))
    .addColumn('handedness', sql`handedness_type`, (col) => col.notNull().defaultTo('both'))
    .addColumn('details', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('bays_location_id_bay_number_unique', ['location_id', 'bay_number'])
    .execute();

  // series
  await db.schema
    .createTable('series')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('location_id', 'uuid', (col) => col.notNull().references('locations.id').onDelete('cascade'))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('start_date', 'date', (col) => col.notNull())
    .addColumn('end_date', 'date', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // leagues
  await db.schema
    .createTable('leagues')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('location_id', 'uuid', (col) => col.notNull().references('locations.id').onDelete('cascade'))
    .addColumn('start_date', 'date', (col) => col.notNull())
    .addColumn('end_date', 'date', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('max_teams', 'integer', (col) => col.defaultTo(8))
    .addColumn('simulator_settings', 'jsonb')
    .addColumn('status', sql`league_status`, (col) => col.notNull().defaultTo('active'))
    .addColumn('banner_image_url', 'text')
    .addColumn('cost', 'decimal(10, 2)')
    .addColumn('payment_type', sql`payment_type`, (col) => col.defaultTo('weekly'))
    .addColumn('day_of_week', sql`day_of_week`)
    .addColumn('start_time', 'time')
    .addColumn('bays', 'jsonb')
    .addColumn('scheduling_format', sql`scheduling_format_type`, (col) => col.defaultTo('round_robin'))
    .addColumn('playoff_format', sql`playoff_format_type`, (col) => col.defaultTo('none'))
    .addColumn('playoff_size', 'integer', (col) => col.defaultTo(0))
    .addColumn('prize_breakdown', 'jsonb')
    .addColumn('handicap_mode', sql`handicap_mode`, (col) => col.notNull().defaultTo('none'))
    .addColumn('series_id', 'uuid', (col) => col.references('series.id').onDelete('set null'))
    .addColumn('is_public', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // league_members
  await db.schema
    .createTable('league_members')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('role', sql`league_member_role`, (col) => col.notNull().defaultTo('spectator'))
    .addColumn('joined_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('league_members_league_id_user_id_unique', ['league_id', 'user_id'])
    .execute();

  // league_membership_requests
  await db.schema
    .createTable('league_membership_requests')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('requested_role', sql`league_member_role`, (col) => col.notNull())
    .addColumn('status', sql`league_request_status`, (col) => col.notNull().defaultTo('pending'))
    .addColumn('message', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('league_membership_requests_unique', ['league_id', 'user_id', 'requested_role'])
    .execute();

  // teams
  await db.schema
    .createTable('teams')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('max_members', 'integer', (col) => col.notNull())
    .addColumn('status', sql`team_status`, (col) => col.notNull().defaultTo('active'))
    .addColumn('team_handicap', 'decimal(5, 1)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // team_members
  await db.schema
    .createTable('team_members')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('team_id', 'uuid', (col) => col.notNull().references('teams.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('role', sql`team_member_role`, (col) => col.notNull().defaultTo('member'))
    .addColumn('status', sql`team_status`, (col) => col.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('team_members_team_id_user_id_unique', ['team_id', 'user_id'])
    .execute();

  // team_join_requests
  await db.schema
    .createTable('team_join_requests')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('team_id', 'uuid', (col) => col.notNull().references('teams.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('status', sql`league_request_status`, (col) => col.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('team_join_requests_team_id_user_id_unique', ['team_id', 'user_id'])
    .execute();

  // matches
  await db.schema
    .createTable('matches')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('home_team_id', 'uuid', (col) => col.notNull().references('teams.id'))
    .addColumn('away_team_id', 'uuid', (col) => col.notNull().references('teams.id'))
    .addColumn('match_date', 'timestamptz', (col) => col.notNull())
    .addColumn('home_team_score', 'integer', (col) => col.defaultTo(0))
    .addColumn('away_team_score', 'integer', (col) => col.defaultTo(0))
    .addColumn('player_details', 'jsonb')
    .addColumn('simulator_settings', 'jsonb')
    .addColumn('status', sql`match_status`, (col) => col.notNull().defaultTo('scheduled'))
    .addColumn('game_format', sql`game_format_type`, (col) => col.defaultTo('individual'))
    .addColumn('match_format', sql`match_format_type`, (col) => col.defaultTo('stroke_play'))
    .addColumn('scoring_format', sql`scoring_format_type`, (col) => col.defaultTo('gross'))
    .addColumn('is_playoff', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('playoff_round', 'integer')
    .addColumn('playoff_seed_home', 'integer')
    .addColumn('playoff_seed_away', 'integer')
    .addColumn('next_match_id', 'uuid', (col) => col.references('matches.id').onDelete('set null'))
    .addColumn('bay_id', 'uuid', (col) => col.references('bays.id').onDelete('set null'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addCheckConstraint('matches_different_teams', sql`home_team_id != away_team_id`)
    .execute();

  // stats
  await db.schema
    .createTable('stats')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('team_id', 'uuid', (col) => col.notNull().references('teams.id').onDelete('cascade'))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('matches_played', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('matches_won', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('matches_lost', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('matches_drawn', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('stats_team_id_league_id_unique', ['team_id', 'league_id'])
    .execute();

  // communications
  await db.schema
    .createTable('communications')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('sender_id', 'uuid', (col) => col.references('users.id'))
    .addColumn('recipient_type', sql`recipient_type`, (col) => col.notNull())
    .addColumn('recipient_id', 'uuid', (col) => col.notNull())
    .addColumn('type', sql`communication_type`, (col) => col.notNull())
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('expiration_date', 'timestamptz')
    .addColumn('sent_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // notifications
  await db.schema
    .createTable('notifications')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('type', sql`notification_type`, (col) => col.notNull())
    .addColumn('action_id', 'uuid')
    .addColumn('is_read', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // password_reset_challenges
  await db.schema
    .createTable('password_reset_challenges')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('challenge_code', 'varchar(6)', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('used', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // match_result_submissions
  await db.schema
    .createTable('match_result_submissions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('matches.id').onDelete('cascade'))
    .addColumn('team_id', 'uuid', (col) => col.notNull().references('teams.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('home_team_score', 'integer', (col) => col.notNull())
    .addColumn('away_team_score', 'integer', (col) => col.notNull())
    .addColumn('notes', 'text')
    .addColumn('status', sql`match_result_status`, (col) => col.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('match_result_submissions_match_team_unique', ['match_id', 'team_id'])
    .execute();

  // league_invites
  await db.schema
    .createTable('league_invites')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('inviter_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('recipient_email', 'varchar(255)', (col) => col.notNull())
    .addColumn('recipient_user_id', 'uuid', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('role', sql`league_member_role`, (col) => col.notNull().defaultTo('player'))
    .addColumn('status', sql`invite_status`, (col) => col.notNull().defaultTo('pending'))
    .addColumn('invite_code', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // player_handicaps
  await db.schema
    .createTable('player_handicaps')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('handicap_index', 'decimal(5, 1)', (col) => col.notNull())
    .addColumn('effective_date', 'date', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // audit_logs
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('action', 'varchar(100)', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_id', 'uuid', (col) => col.notNull())
    .addColumn('details', 'jsonb')
    .addColumn('ip_address', 'varchar(45)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // account — stores credential + OAuth accounts (better-auth)
  await db.schema
    .createTable('account')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('account_id', 'text', (col) => col.notNull())
    .addColumn('provider_id', 'text', (col) => col.notNull())
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('id_token', 'text')
    .addColumn('access_token_expires_at', 'timestamptz')
    .addColumn('refresh_token_expires_at', 'timestamptz')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // session — better-auth sessions
  await db.schema
    .createTable('session')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('token', 'text', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ip_address', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // verification — email verification / password reset tokens (better-auth)
  await db.schema
    .createTable('verification')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('identifier', 'text', (col) => col.notNull())
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // jwks — JWT signing keys (managed by better-auth JWT plugin)
  await db.schema
    .createTable('jwks')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('public_key', 'text', (col) => col.notNull())
    .addColumn('private_key', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // ──────────────────────────────────────────────
  // Indexes from original migrations
  // ──────────────────────────────────────────────

  // league_invites indexes
  await db.schema
    .createIndex('idx_league_invites_invite_code')
    .on('league_invites')
    .column('invite_code')
    .execute();

  await db.schema
    .createIndex('idx_league_invites_recipient_email')
    .on('league_invites')
    .column('recipient_email')
    .execute();

  // player_handicaps indexes
  await db.schema
    .createIndex('idx_player_handicaps_unique')
    .on('player_handicaps')
    .columns(['user_id', 'league_id', 'effective_date'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_player_handicaps_league')
    .on('player_handicaps')
    .column('league_id')
    .execute();

  // leagues → series FK index
  await db.schema
    .createIndex('idx_leagues_series_id')
    .on('leagues')
    .column('series_id')
    .execute();

  // series → location FK index
  await db.schema
    .createIndex('idx_series_location_id')
    .on('series')
    .column('location_id')
    .execute();

  // audit_logs indexes
  await db.schema
    .createIndex('idx_audit_logs_entity')
    .on('audit_logs')
    .columns(['entity_type', 'entity_id'])
    .execute();

  await db.schema
    .createIndex('idx_audit_logs_user_id')
    .on('audit_logs')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_audit_logs_action')
    .on('audit_logs')
    .column('action')
    .execute();

  // matches playoff index
  await db.schema
    .createIndex('idx_matches_playoff')
    .on('matches')
    .columns(['league_id', 'is_playoff', 'playoff_round'])
    .execute();

  // matches bay index
  await db.schema
    .createIndex('idx_matches_bay_id')
    .on('matches')
    .column('bay_id')
    .execute();

  // leagues name search index
  await db.schema
    .createIndex('idx_leagues_name_lower')
    .on('leagues')
    .expression(sql`lower(name)`)
    .execute();

  // account indexes
  await db.schema
    .createIndex('idx_account_user_id')
    .on('account')
    .column('user_id')
    .execute();

  // session indexes
  await db.schema
    .createIndex('idx_session_user_id')
    .on('session')
    .column('user_id')
    .execute();

  // verification indexes
  await db.schema
    .createIndex('idx_verification_identifier')
    .on('verification')
    .column('identifier')
    .execute();

  // ──────────────────────────────────────────────
  // updated_at triggers (all tables except audit_logs)
  // ──────────────────────────────────────────────
  const tablesWithTrigger = [
    'users', 'owners', 'locations', 'bays', 'series', 'leagues',
    'league_members', 'league_membership_requests', 'teams', 'team_members',
    'team_join_requests', 'matches', 'stats', 'communications', 'notifications',
    'password_reset_challenges', 'match_result_submissions', 'league_invites',
    'player_handicaps', 'account', 'session', 'verification',
  ];

  for (const table of tablesWithTrigger) {
    await sql`
      CREATE TRIGGER ${sql.raw(`update_${table}_updated_at`)}
        BEFORE UPDATE ON ${sql.raw(table)}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `.execute(db);
  }
}
