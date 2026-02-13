import { Generated } from "kysely";

export type UserRole = "user" | "admin";
export type TeamMemberRole = "captain" | "member";
export type TeamStatus = "active" | "inactive";
export type LeagueStatus = "pending" | "active" | "completed" | "inactive";
export type MatchStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type MatchGameStatus = "pending" | "in_progress" | "completed";
export type JoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";
export type LeagueMemberRole = "player" | "spectator" | "manager";
export type LeagueRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";
export type NotificationType =
  | "league_invite"
  | "team_invite"
  | "match_reminder"
  | "match_result"
  | "team_join_request"
  | "league_join_request"
  | "system_message"
  | "series_new_league";
export type MatchResultStatus = "pending" | "approved" | "rejected";
export type CommunicationType =
  | "system"
  | "league"
  | "maintenance"
  | "advertisement"
  | "schedule";
export type InviteStatus = "pending" | "accepted" | "expired";
export type PaymentType = "weekly" | "monthly" | "upfront" | "free";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type HandednessType = "left" | "right" | "both";
export type GameFormatType =
  | "scramble"
  | "best_ball"
  | "alternate_shot"
  | "individual";
export type MatchFormatType = "stroke_play" | "match_play";
export type ScoringFormatType = "net" | "gross";
export type SchedulingFormatType =
  | "round_robin"
  | "groups"
  | "swiss"
  | "ladder"
  | "custom";
export type PlayoffFormatType =
  | "none"
  | "single_elimination"
  | "double_elimination"
  | "round_robin";
export type HandicapMode = "none" | "manual" | "auto";
export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing";

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
  password_reset_challenges: PasswordResetChallengeTable;
  league_invites: LeagueInviteTable;
  player_handicaps: PlayerHandicapTable;
  series: SeriesTable;
  audit_logs: AuditLogTable;
  // better-auth tables
  account: AccountTable;
  session: SessionTable;
  verification: VerificationTable;
  jwks: JwksTable;
}

export interface UserTable {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  email_verified: Generated<boolean>;
  role: UserRole;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface OwnerTable {
  id: string;
  user_id: string;
  name: string;
  subscription_tier: Generated<SubscriptionTier>;
  subscription_status: Generated<SubscriptionStatus>;
  subscription_expires_at?: Date | null;
  max_locations: Generated<number>;
  max_leagues_per_location: Generated<number>;
  payment_provider_customer_id?: string | null;
  payment_provider_subscription_id?: string | null;
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
  scheduling_format: SchedulingFormatType;
  playoff_format: PlayoffFormatType;
  playoff_size: number;
  prize_breakdown: unknown | null;
  handicap_mode: HandicapMode;
  series_id?: string | null;
  is_public: Generated<boolean>;
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
  team_handicap?: number | null;
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
  game_format?: GameFormatType;
  match_format?: MatchFormatType;
  scoring_format?: ScoringFormatType;
  is_playoff: Generated<boolean>;
  playoff_round?: number | null;
  playoff_seed_home?: number | null;
  playoff_seed_away?: number | null;
  next_match_id?: string | null;
  bay_id?: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StatsTable {
  id: string;
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
  id: string;
  sender_id?: string | null;
  recipient_type: "league" | "team" | "user";
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

export interface PlayerHandicapTable {
  id: string;
  user_id: string;
  league_id: string;
  handicap_index: number;
  effective_date: Date;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LeagueInviteTable {
  id: string;
  league_id: string;
  inviter_id: string;
  recipient_email: string;
  recipient_user_id?: string | null;
  role: LeagueMemberRole;
  status: InviteStatus;
  invite_code: string;
  expires_at: Date;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PasswordResetChallengeTable {
  id: string;
  user_id: string;
  email: string;
  challenge_code: string;
  expires_at: Date;
  used: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SeriesTable {
  id: string;
  location_id: string;
  name: string;
  description?: string | null;
  start_date: Date;
  end_date: Date;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface AuditLogTable {
  id: Generated<string>;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: Generated<Date>;
}

// ──────────────────────────────────────────────
// better-auth tables
// ──────────────────────────────────────────────

export interface AccountTable {
  id: string;
  user_id: string;
  account_id: string;
  provider_id: string;
  access_token?: string | null;
  refresh_token?: string | null;
  id_token?: string | null;
  access_token_expires_at?: Date | null;
  refresh_token_expires_at?: Date | null;
  scope?: string | null;
  password?: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SessionTable {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expires_at: Date;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface JwksTable {
  id: string;
  public_key: string;
  private_key: string;
  created_at: Generated<Date>;
}
