import { db } from '../db';
import bcrypt from 'bcrypt';

export async function createTestUser(overrides: Partial<{
  username: string;
  email: string;
  password: string;
}> = {}) {
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.insertInto('users')
    .values({
      username: overrides.username || 'testuser',
      email: overrides.email || 'test@example.com',
      password_hash: passwordHash
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    username: overrides.username || 'testuser',
    email: overrides.email || 'test@example.com',
    password
  };
}

export async function createTestManager(userId: number, overrides: Partial<{
  name: string;
}> = {}) {
  const result = await db.insertInto('managers')
    .values({
      user_id: userId,
      name: overrides.name || 'Test Manager'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    user_id: userId,
    name: overrides.name || 'Test Manager'
  };
}

export async function createTestLocation(managerId: number, overrides: Partial<{
  name: string;
  address: string;
}> = {}) {
  const result = await db.insertInto('locations')
    .values({
      manager_id: managerId,
      name: overrides.name || 'Test Location',
      address: overrides.address || '123 Test St'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    manager_id: managerId,
    name: overrides.name || 'Test Location',
    address: overrides.address || '123 Test St'
  };
}

export async function createTestLeague(locationId: number, overrides: Partial<{
  name: string;
  start_date: Date;
  end_date: Date;
  max_teams: number;
  status: 'active' | 'completed' | 'cancelled';
}> = {}) {
  const result = await db.insertInto('leagues')
    .values({
      location_id: locationId,
      name: overrides.name || 'Test League',
      start_date: overrides.start_date || new Date('2024-01-01'),
      end_date: overrides.end_date || new Date('2024-12-31'),
      max_teams: overrides.max_teams || 12,
      status: overrides.status || 'active'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    location_id: locationId,
    name: overrides.name || 'Test League',
    start_date: overrides.start_date || new Date('2024-01-01'),
    end_date: overrides.end_date || new Date('2024-12-31'),
    max_teams: overrides.max_teams || 12,
    status: overrides.status || 'active'
  };
}

export async function createTestTeam(leagueId: number, captainUserId: number, overrides: Partial<{
  name: string;
  max_members: number;
  status: 'active' | 'inactive';
}> = {}) {
  const result = await db.insertInto('teams')
    .values({
      league_id: leagueId,
      captain_user_id: captainUserId,
      name: overrides.name || 'Test Team',
      max_members: overrides.max_members || 4,
      status: overrides.status || 'active'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    league_id: leagueId,
    captain_user_id: captainUserId,
    name: overrides.name || 'Test Team',
    max_members: overrides.max_members || 4,
    status: overrides.status || 'active'
  };
}

export async function createTestTeamMember(teamId: number, userId: number, overrides: Partial<{
  role: 'captain' | 'member';
  status: 'active' | 'inactive';
}> = {}) {
  const result = await db.insertInto('team_members')
    .values({
      team_id: teamId,
      user_id: userId,
      role: overrides.role || 'member',
      status: overrides.status || 'active'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    team_id: teamId,
    user_id: userId,
    role: overrides.role || 'member',
    status: overrides.status || 'active'
  };
}

export async function createTestMatch(leagueId: number, homeTeamId: number, awayTeamId: number, overrides: Partial<{
  match_date: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}> = {}) {
  const result = await db.insertInto('matches')
    .values({
      league_id: leagueId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: overrides.match_date || new Date(),
      status: overrides.status || 'scheduled'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    league_id: leagueId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    match_date: overrides.match_date || new Date(),
    status: overrides.status || 'scheduled'
  };
}

export async function createTestMatchGame(
  matchId: number,
  homePlayerId: number,
  awayPlayerId: number,
  overrides: Partial<{
    game_number: number;
    home_score: number | null;
    away_score: number | null;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  }> = {}
) {
  const result = await db.insertInto('match_games')
    .values({
      match_id: matchId,
      game_number: overrides.game_number || 1,
      home_player_id: homePlayerId,
      away_player_id: awayPlayerId,
      home_score: overrides.home_score ?? null,
      away_score: overrides.away_score ?? null,
      status: overrides.status || 'scheduled'
    })
    .executeTakeFirst();

  return {
    id: Number(result.insertId),
    match_id: matchId,
    game_number: overrides.game_number || 1,
    home_player_id: homePlayerId,
    away_player_id: awayPlayerId,
    home_score: overrides.home_score ?? null,
    away_score: overrides.away_score ?? null,
    status: overrides.status || 'scheduled'
  };
} 