import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { UserRole, TeamMemberRole, TeamStatus, LeagueStatus, MatchStatus, MatchGameStatus } from '../../src/types/database';

// Mock users
export async function createTestUser(overrides: Partial<{
  username: string;
  email: string;
  password: string;
  role: UserRole;
}> = {}) {
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuidv4();

  return {
    id,
    username: overrides.username || 'testuser',
    email: overrides.email || 'test@example.com',
    password_hash: passwordHash,
    role: overrides.role || 'user' as UserRole,
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock managers
export async function createTestManager(userId: string, overrides: Partial<{
  name: string;
}> = {}) {
  return {
    id: uuidv4(),
    user_id: userId,
    name: overrides.name || 'Test Manager',
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock locations
export async function createTestLocation(managerId: string, overrides: Partial<{
  name: string;
  address: string;
}> = {}) {
  return {
    id: uuidv4(),
    manager_id: managerId,
    name: overrides.name || 'Test Location',
    address: overrides.address || '123 Test St',
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock leagues
export async function createTestLeague(locationId: string, overrides: Partial<{
  name: string;
  start_date: Date;
  end_date: Date;
  max_teams: number;
  status: LeagueStatus;
}> = {}) {
  return {
    id: uuidv4(),
    location_id: locationId,
    name: overrides.name || 'Test League',
    start_date: overrides.start_date || new Date('2024-01-01'),
    end_date: overrides.end_date || new Date('2024-12-31'),
    max_teams: overrides.max_teams || 12,
    status: overrides.status || 'active' as LeagueStatus,
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock teams
export async function createTestTeam(leagueId: string, overrides: Partial<{
  name: string;
  max_members: number;
  status: TeamStatus;
}> = {}) {
  return {
    id: uuidv4(),
    league_id: leagueId,
    name: overrides.name || 'Test Team',
    max_members: overrides.max_members || 4,
    status: overrides.status || 'active' as TeamStatus,
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock team members
export async function createTestTeamMember(teamId: string, userId: string, overrides: Partial<{
  role: TeamMemberRole;
  status: TeamStatus;
}> = {}) {
  return {
    id: uuidv4(),
    team_id: teamId,
    user_id: userId,
    role: overrides.role || 'member' as TeamMemberRole,
    status: overrides.status || 'active' as TeamStatus,
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock matches
export async function createTestMatch(leagueId: string, homeTeamId: string, awayTeamId: string, overrides: Partial<{
  match_date: Date;
  status: MatchStatus;
}> = {}) {
  return {
    id: uuidv4(),
    league_id: leagueId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    match_date: overrides.match_date || new Date(),
    status: overrides.status || 'scheduled' as MatchStatus,
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Mock match games
export async function createTestMatchGame(
  matchId: string,
  homePlayerId: string,
  awayPlayerId: string,
  overrides: Partial<{
    game_number: number;
    home_score: number | null;
    away_score: number | null;
    status: MatchGameStatus;
  }> = {}
) {
  return {
    id: uuidv4(),
    match_id: matchId,
    game_number: overrides.game_number || 1,
    home_player_id: homePlayerId,
    away_player_id: awayPlayerId,
    home_score: overrides.home_score ?? null,
    away_score: overrides.away_score ?? null,
    status: overrides.status || 'pending' as MatchGameStatus,
    created_at: new Date(),
    updated_at: new Date()
  };
} 