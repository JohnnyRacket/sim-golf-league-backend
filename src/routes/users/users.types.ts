// User data types
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  is_manager?: boolean;
  manager_details?: ManagerDetails | null;
}

export interface ManagerDetails {
  id: string;
  name: string;
}

export interface UpdateUserBody {
  username?: string;
  email?: string;
}

// Team data for user dashboard
export interface UserTeam {
  team_id: string;
  team_name: string;
  member_role: string;
  league_id: string;
  league_name: string;
  league_status: string;
}

// Match data for user dashboard
export interface UserMatch {
  id: string;
  match_date: Date;
  status: string;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  home_team_score?: number;
  away_team_score?: number;
}

// Stats data for user
export interface UserStats {
  matches_played: number;
  matches_won: number;
  average_score: number;
  handicap: number;
}

// Dashboard data
export interface UserDashboard {
  teams: UserTeam[];
  upcomingMatches: UserMatch[];
  recentMatches: UserMatch[];
  stats: UserStats;
}

// Schema components
export const managerDetailsSchema = {
  type: ['object', 'null'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' }
  }
};

export const userTeamSchema = {
  type: 'object',
  properties: {
    team_id: { type: 'string', format: 'uuid' },
    team_name: { type: 'string' },
    member_role: { type: 'string' },
    league_id: { type: 'string', format: 'uuid' },
    league_name: { type: 'string' },
    league_status: { type: 'string' }
  }
};

export const userMatchBaseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    status: { type: 'string' },
    home_team_id: { type: 'string', format: 'uuid' },
    home_team_name: { type: 'string' },
    away_team_id: { type: 'string', format: 'uuid' },
    away_team_name: { type: 'string' }
  }
};

export const userMatchWithScoreSchema = {
  type: 'object',
  properties: {
    ...userMatchBaseSchema.properties,
    home_team_score: { type: 'number' },
    away_team_score: { type: 'number' }
  }
};

export const userStatsSchema = {
  type: 'object',
  properties: {
    matches_played: { type: 'number' },
    matches_won: { type: 'number' },
    average_score: { type: 'number' },
    handicap: { type: 'number' }
  }
};

// Response schemas
export const userBasicSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  }
};

export const userListSchema = {
  type: 'array',
  items: userBasicSchema
};

export const userProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    is_manager: { type: 'boolean' },
    manager_details: managerDetailsSchema
  }
};

export const updateUserSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' }
  }
};

export const userIdParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
};

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
};

export const successMessageSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' }
  }
};

export const userDashboardSchema = {
  type: 'object',
  properties: {
    teams: {
      type: 'array',
      items: userTeamSchema
    },
    upcomingMatches: {
      type: 'array',
      items: userMatchBaseSchema
    },
    recentMatches: {
      type: 'array',
      items: userMatchWithScoreSchema
    },
    stats: userStatsSchema
  }
}; 