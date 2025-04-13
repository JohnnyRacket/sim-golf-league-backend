import { Generated } from 'kysely';

export type UserRole = 'user' | 'admin';
export type TeamMemberRole = 'captain' | 'member';
export type TeamStatus = 'active' | 'inactive';
export type LeagueStatus = 'pending' | 'active' | 'completed';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MatchGameStatus = 'pending' | 'in_progress' | 'completed';

export interface Database {
  users: UserTable;
  managers: ManagerTable;
  locations: LocationTable;
  leagues: LeagueTable;
  teams: TeamTable;
  team_members: TeamMemberTable;
  matches: MatchTable;
  match_games: MatchGameTable;
  stats: StatsTable;
  communications: CommunicationTable;
}

export interface UserTable {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ManagerTable {
  id: string;
  user_id: string;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LocationTable {
  id: string;
  manager_id: string;
  name: string;
  address: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LeagueTable {
  id: string;
  location_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  max_teams: number;
  status: LeagueStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TeamTable {
  id: string;
  league_id: string;
  name: string;
  captain_id: string;
  max_members: number;
  status: TeamStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TeamMemberTable {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  status: TeamStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MatchTable {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: Date;
  status: MatchStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MatchGameTable {
  id: string;
  match_id: string;
  game_number: number;
  home_player_id: string;
  away_player_id: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchGameStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StatsTable {
  id: Generated<number>;
  user_id: string;
  league_id: string;
  matches_played: number;
  matches_won: number;
  total_score: number;
  average_score: number;
  handicap: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CommunicationTable {
  id: Generated<number>;
  sender_id: string;
  recipient_type: 'league' | 'team' | 'user';
  recipient_id: string;
  message: string;
  sent_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
} 