import { Generated } from 'kysely';

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
  id: Generated<number>;
  username: string;
  email: string;
  password_hash: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ManagerTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LocationTable {
  id: Generated<number>;
  manager_id: number;
  name: string;
  address: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LeagueTable {
  id: Generated<number>;
  location_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  max_teams: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TeamTable {
  id: Generated<number>;
  league_id: number;
  name: string;
  captain_user_id: number;
  max_members: number;
  status: 'active' | 'inactive';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TeamMemberTable {
  id: Generated<number>;
  team_id: number;
  user_id: number;
  role: 'captain' | 'member';
  status: 'active' | 'inactive';
  joined_date: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MatchTable {
  id: Generated<number>;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MatchGameTable {
  id: Generated<number>;
  match_id: number;
  game_number: number;
  home_player_id: number;
  away_player_id: number;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StatsTable {
  id: Generated<number>;
  team_member_id: number;
  league_id: number;
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
  sender_id: number;
  recipient_type: 'league' | 'team' | 'user';
  recipient_id: number;
  message: string;
  sent_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
} 