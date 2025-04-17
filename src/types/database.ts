import { Generated } from 'kysely';

export type UserRole = 'user' | 'admin';
export type TeamMemberRole = 'member';
export type TeamStatus = 'active' | 'inactive';
export type LeagueStatus = 'pending' | 'active' | 'completed';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MatchGameStatus = 'pending' | 'in_progress' | 'completed';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeagueMemberRole = 'player' | 'spectator' | 'manager';
export type LeagueRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type NotificationType = 'league_invite' | 'team_invite' | 'match_reminder' | 'match_result' | 'team_join_request' | 'league_join_request' | 'system_message';
export type MatchResultStatus = 'pending' | 'approved' | 'rejected';
export type CommunicationType = 'system' | 'league' | 'maintenance' | 'advertisement' | 'schedule';
export type PaymentType = 'weekly' | 'monthly' | 'upfront' | 'free';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type HandednessType = 'left' | 'right' | 'both';

export interface Database {
  users: UserTable;
  owners: OwnerTable;
  locations: LocationTable;
  leagues: LeagueTable;
  league_members: LeagueMemberTable;
  league_membership_requests: LeagueMembershipRequestTable;
  teams: TeamTable;
  team_members: TeamMemberTable;
  team_join_requests: TeamJoinRequestTable;
  matches: MatchTable;
  stats: StatsTable;
  communications: CommunicationTable;
  notifications: NotificationTable;
  match_result_submissions: MatchResultSubmissionTable;
  bays: BayTable;
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

export interface OwnerTable {
  id: string;
  user_id: string;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LocationTable {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  logo_url?: string | null;
  banner_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  coordinates?: string | null; // PostgreSQL POINT type stored as string
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface BayTable {
  id: string;
  location_id: string;
  bay_number: string;
  max_people: number;
  handedness: HandednessType;
  details?: Record<string, unknown>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LeagueTable {
  id: string;
  name: string;
  location_id: string;
  start_date: Date;
  end_date: Date;
  description?: string;
  max_teams: number;
  simulator_settings?: Record<string, unknown>;
  status: LeagueStatus;
  banner_image_url?: string;
  cost?: number;
  payment_type?: PaymentType;
  day_of_week?: DayOfWeek;
  start_time?: string; // Store as string in HH:MM:SS format
  bays?: string[]; // Array of bay IDs
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LeagueMemberTable {
  id: string;
  league_id: string;
  user_id: string;
  role: LeagueMemberRole;
  joined_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LeagueMembershipRequestTable {
  id: string;
  league_id: string;
  user_id: string;
  requested_role: LeagueMemberRole;
  status: LeagueRequestStatus;
  message?: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TeamTable {
  id: string;
  league_id: string;
  name: string;
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
  home_team_score: number;
  away_team_score: number;
  player_details?: Record<string, any>;
  simulator_settings?: Record<string, any>;
  status: MatchStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StatsTable {
  id: Generated<number>;
  team_id: string;
  league_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  matches_drawn: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CommunicationTable {
  id: Generated<number>;
  sender_id?: string;
  recipient_type: 'league' | 'team' | 'user';
  recipient_id: string;
  type: CommunicationType;
  title: string;
  message: string;
  expiration_date?: Date;
  sent_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TeamJoinRequestTable {
  id: string;
  team_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface NotificationTable {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  action_id?: string;
  is_read: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MatchResultSubmissionTable {
  id: string;
  match_id: string;
  team_id: string;
  user_id: string;
  home_team_score: number;
  away_team_score: number;
  notes?: string;
  status: MatchResultStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
} 