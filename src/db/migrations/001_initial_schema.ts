import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create custom types
  await sql`CREATE TYPE user_role AS ENUM ('user', 'admin')`.execute(db);
  await sql`CREATE TYPE team_member_role AS ENUM ('captain', 'member')`.execute(db);
  await sql`CREATE TYPE team_status AS ENUM ('active', 'inactive')`.execute(db);
  await sql`CREATE TYPE league_status AS ENUM ('pending', 'active', 'completed')`.execute(db);
  await sql`CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled')`.execute(db);
  await sql`CREATE TYPE match_game_status AS ENUM ('pending', 'in_progress', 'completed')`.execute(db);
  await sql`CREATE TYPE recipient_type AS ENUM ('league', 'team', 'user')`.execute(db);
  await sql`CREATE TYPE league_member_role AS ENUM ('player', 'spectator', 'manager')`.execute(db);
  await sql`CREATE TYPE league_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled')`.execute(db);
  await sql`CREATE TYPE notification_type AS ENUM ('league_invite', 'team_invite', 'match_reminder', 'match_result', 'team_join_request', 'league_join_request', 'system_message')`.execute(db);
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

  // Create users table
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('username', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('role', sql`user_role`, (col) => col.notNull().defaultTo('user'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Create owners table
  await db.schema
    .createTable('owners')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Create locations table
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

  // Create bays table
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

  // Create leagues table
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
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Create league_members table
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

  // Create league_membership_requests table
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

  // Create teams table
  await db.schema
    .createTable('teams')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('league_id', 'uuid', (col) => col.notNull().references('leagues.id').onDelete('cascade'))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('max_members', 'integer', (col) => col.notNull())
    .addColumn('status', sql`team_status`, (col) => col.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Create team_members table
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

  // Create team_join_requests table
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

  // Create matches table
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
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addCheckConstraint('matches_different_teams', sql`home_team_id != away_team_id`)
    .execute();

  // Create stats table
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

  // Create communications table
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

  // Create notifications table
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

  // Create password_reset_challenges table
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

  // Create match_result_submissions table
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

  // Create updated_at trigger function
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `.execute(db);

  // Create triggers for all tables
  const tables = [
    'users', 'owners', 'locations', 'leagues', 'league_members',
    'league_membership_requests', 'teams', 'team_members', 'team_join_requests',
    'matches', 'stats', 'communications', 'notifications', 'bays',
    'password_reset_challenges', 'match_result_submissions'
  ];

  for (const table of tables) {
    await sql`
      CREATE TRIGGER ${sql.raw(`update_${table}_updated_at`)}
        BEFORE UPDATE ON ${sql.raw(table)}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `.execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse dependency order
  const tables = [
    'match_result_submissions', 'password_reset_challenges', 'notifications',
    'communications', 'stats', 'matches', 'team_join_requests', 'team_members',
    'teams', 'league_membership_requests', 'league_members', 'leagues', 'bays',
    'locations', 'owners', 'users'
  ];

  for (const table of tables) {
    await db.schema.dropTable(table).ifExists().cascade().execute();
  }

  // Drop trigger function
  await sql`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`.execute(db);

  // Drop custom types
  const types = [
    'playoff_format_type', 'scheduling_format_type', 'scoring_format_type',
    'match_format_type', 'game_format_type', 'handedness_type', 'day_of_week',
    'payment_type', 'communication_type', 'match_result_status', 'notification_type',
    'league_request_status', 'league_member_role', 'recipient_type', 'match_game_status',
    'match_status', 'league_status', 'team_status', 'team_member_role', 'user_role'
  ];

  for (const type of types) {
    await sql`DROP TYPE IF EXISTS ${sql.raw(type)} CASCADE`.execute(db);
  }
}
