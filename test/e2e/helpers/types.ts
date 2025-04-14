import { 
  UserRole, 
  TeamMemberRole, 
  TeamStatus, 
  LeagueStatus, 
  MatchStatus, 
  MatchGameStatus 
} from '../../../src/types/database';

export interface SeedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface SeedManager {
  id: string;
  user_id: string;
  name: string;
}

export interface SeedLocation {
  id: string;
  manager_id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface SeedLeague {
  id: string;
  location_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  max_teams: number;
  status: LeagueStatus;
}

export interface SeedTeam {
  id: string;
  league_id: string;
  name: string;
  max_members: number;
  status: TeamStatus;
}

export interface SeedTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  status: string;
}

export interface SeedMatch {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: Date;
  status: MatchStatus;
}

export interface SeedMatchGame {
  id: string;
  match_id: string;
  game_number: number;
  home_player_id: string;
  away_player_id: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchGameStatus;
}

export interface SeedTokens {
  admin: string;
  user: string;
}

export interface SeedData {
  users: SeedUser[];
  managers: SeedManager[];
  locations: SeedLocation[];
  leagues: SeedLeague[];
  teams: SeedTeam[];
  teamMembers: SeedTeamMember[];
  matches: SeedMatch[];
  matchGames: SeedMatchGame[];
  tokens: SeedTokens;
} 