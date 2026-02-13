import {
  UserRole,
  TeamMemberRole,
  TeamStatus,
  LeagueStatus,
  MatchStatus,
  NotificationType,
  MatchResultStatus,
  CommunicationType,
  HandednessType,
  SchedulingFormatType,
  PlayoffFormatType,
  InviteStatus,
  LeagueMemberRole,
} from "../../../src/types/database";

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
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  phone?: string;
  coordinates?: { x: number; y: number };
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
  scheduling_format: SchedulingFormatType;
  playoff_format: PlayoffFormatType;
  playoff_size: number;
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

export interface SeedNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  action_id?: string;
  is_read: boolean;
}

export interface SeedMatchResultSubmission {
  id: string;
  match_id: string;
  team_id: string;
  user_id: string;
  home_team_score: number;
  away_team_score: number;
  notes?: string;
  status: MatchResultStatus;
}

export interface SeedCommunication {
  id: string;
  sender_id?: string;
  recipient_type: "league" | "team" | "user";
  recipient_id: string;
  type: CommunicationType;
  title: string;
  message: string;
  expiration_date?: Date;
  sent_at: Date;
}

export interface SeedBay {
  id: string;
  location_id: string;
  bay_number: string;
  max_people: number;
  handedness: HandednessType;
  details?: Record<string, unknown>;
}

export interface SeedSeries {
  id: string;
  location_id: string;
  name: string;
  description?: string | null;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
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
  notifications: SeedNotification[];
  matchResultSubmissions: SeedMatchResultSubmission[];
  communications: SeedCommunication[];
  bays: SeedBay[];
  series: SeedSeries[];
  tokens: SeedTokens;
}
