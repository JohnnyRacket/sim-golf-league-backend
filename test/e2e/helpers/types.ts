import { 
  UserRole, 
  TeamMemberRole, 
  TeamStatus, 
  LeagueStatus, 
  MatchStatus 
} from '../../../src/types/database';

export interface SeedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface SeedOwner {
  id: string;
  user_id: string;
  name: string;
}

export interface SeedLocation {
  id: string;
  owner_id: string;
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
  home_team_score: number;
  away_team_score: number;
  player_details: Record<string, any>;
}

export interface SeedTokens {
  admin: string;
  user: string;
}

export interface SeedData {
  users: SeedUser[];
  owners: SeedOwner[];
  locations: SeedLocation[];
  leagues: SeedLeague[];
  teams: SeedTeam[];
  teamMembers: SeedTeamMember[];
  matches: SeedMatch[];
  tokens: SeedTokens;
} 