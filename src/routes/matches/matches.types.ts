import { MatchStatus } from "../../types/enums";
import { MatchTable } from "../../types/database";

// API Request/Response interfaces
export interface CreateMatchBody {
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  simulator_settings?: Record<string, any>;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  game_format?: 'scramble' | 'best_ball' | 'alternate_shot' | 'individual';
  match_format?: 'stroke_play' | 'match_play';
  scoring_format?: 'net' | 'gross';
}

export interface UpdateMatchBody {
  match_date?: string;
  simulator_settings?: Record<string, any>;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  game_format?: 'scramble' | 'best_ball' | 'alternate_shot' | 'individual';
  match_format?: 'stroke_play' | 'match_play';
  scoring_format?: 'net' | 'gross';
}

export interface MatchGameBody {
  game_number: number;
  home_player_id: string;
  away_player_id: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ScoreUpdateBody {
  home_score: number;
  away_score: number;
}

export interface SubmitMatchResultsBody {
  status: 'in_progress' | 'completed' | 'cancelled';
  games: {
    home_player_id: string;
    away_player_id: string;
    home_score: number;
    away_score: number;
  }[];
}

// Service interfaces
export interface TeamInfo {
  id: string;
  name: string;
}

export interface LeagueInfo {
  id: string;
  name: string;
}

export interface EnhancedMatch {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: Date;
  status: MatchStatus;
  home_team_score: number;
  away_team_score: number;
  player_details?: Record<string, any>;
  simulator_settings?: Record<string, any>;
  game_format?: 'scramble' | 'best_ball' | 'alternate_shot' | 'individual';
  match_format?: 'stroke_play' | 'match_play';
  scoring_format?: 'net' | 'gross';
  created_at: Date;
  updated_at: Date;
  home_team?: TeamInfo;
  away_team?: TeamInfo;
  league?: LeagueInfo;
}

export interface UserMatchSummary {
  league_id: string;
  league_name: string;
  team_id: string;
  team_name: string;
  matches_played: number;
  games_won: number;
  average_score: number;
}

export interface ManagerInfo {
  user_id: string;
}

export interface MatchWithTeams {
  id: string;
  match_date: Date | string;
  status: MatchStatus;
  home_team_id: string;
  home_team_name: string;
  home_team_score?: number;
  away_team_id: string;
  away_team_name: string;
  away_team_score?: number;
  league_id: string;
  league_name: string;
  simulator_settings?: Record<string, any>;
  game_format?: string;
  match_format?: string;
  scoring_format?: string;
}

// API Schema definitions
export const teamInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' }
  },
  required: ['id', 'name']
};

export const leagueInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' }
  },
  required: ['id', 'name']
};

export const matchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    league_id: { type: 'string', format: 'uuid' },
    home_team_id: { type: 'string', format: 'uuid' },
    away_team_id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
    home_team_score: { type: 'integer', minimum: 0 },
    away_team_score: { type: 'integer', minimum: 0 },
    game_format: { type: 'string', enum: ['scramble', 'best_ball', 'alternate_shot', 'individual'] },
    match_format: { type: 'string', enum: ['stroke_play', 'match_play'] },
    scoring_format: { type: 'string', enum: ['net', 'gross'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    player_details: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'league_id', 'home_team_id', 'away_team_id', 'match_date', 'status']
};

export const enhancedMatchSchema = {
  type: 'object',
  properties: {
    ...matchSchema.properties,
    home_team: teamInfoSchema,
    away_team: teamInfoSchema,
    league: leagueInfoSchema
  },
  required: [...matchSchema.required, 'home_team', 'away_team', 'league']
};

export const matchWithTeamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
    home_team_id: { type: 'string', format: 'uuid' },
    home_team_name: { type: 'string' },
    home_team_score: { type: 'integer', minimum: 0 },
    away_team_id: { type: 'string', format: 'uuid' },
    away_team_name: { type: 'string' },
    away_team_score: { type: 'integer', minimum: 0 },
    league_id: { type: 'string', format: 'uuid' },
    league_name: { type: 'string' },
    simulator_settings: {
      type: 'object',
      additionalProperties: true
    },
    game_format: { type: 'string', enum: ['scramble', 'best_ball', 'alternate_shot', 'individual'] },
    match_format: { type: 'string', enum: ['stroke_play', 'match_play'] },
    scoring_format: { type: 'string', enum: ['net', 'gross'] }
  },
  required: ['id', 'match_date', 'status', 'home_team_id', 'home_team_name', 'away_team_id', 'away_team_name', 'league_id', 'league_name']
};

export const upcomingMatchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
    home_team_id: { type: 'string', format: 'uuid' },
    home_team_name: { type: 'string' },
    away_team_id: { type: 'string', format: 'uuid' },
    away_team_name: { type: 'string' },
    league_id: { type: 'string', format: 'uuid' },
    league_name: { type: 'string' },
    game_format: { type: 'string', enum: ['scramble', 'best_ball', 'alternate_shot', 'individual'] },
    match_format: { type: 'string', enum: ['stroke_play', 'match_play'] },
    scoring_format: { type: 'string', enum: ['net', 'gross'] }
  },
  required: ['id', 'match_date', 'status', 'home_team_id', 'home_team_name', 'away_team_id', 'away_team_name', 'league_id', 'league_name']
};

export const userMatchSummarySchema = {
  type: 'object',
  properties: {
    league_id: { type: 'string', format: 'uuid' },
    league_name: { type: 'string' },
    team_id: { type: 'string', format: 'uuid' },
    team_name: { type: 'string' },
    matches_played: { type: 'integer', minimum: 0 },
    games_won: { type: 'integer', minimum: 0 },
    average_score: { type: 'number', minimum: 0 }
  },
  required: ['league_id', 'league_name', 'team_id', 'team_name', 'matches_played', 'games_won', 'average_score']
};

export const createMatchSchema = {
  type: 'object',
  properties: {
    league_id: { type: 'string', format: 'uuid' },
    home_team_id: { type: 'string', format: 'uuid' },
    away_team_id: { type: 'string', format: 'uuid' },
    match_date: { type: 'string', format: 'date-time' },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
    game_format: { type: 'string', enum: ['scramble', 'best_ball', 'alternate_shot', 'individual'] },
    match_format: { type: 'string', enum: ['stroke_play', 'match_play'] },
    scoring_format: { type: 'string', enum: ['net', 'gross'] }
  },
  required: ['league_id', 'home_team_id', 'away_team_id', 'match_date']
};

export const updateMatchSchema = {
  type: 'object',
  properties: {
    match_date: { type: 'string', format: 'date-time' },
    simulator_settings: { 
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
    game_format: { type: 'string', enum: ['scramble', 'best_ball', 'alternate_shot', 'individual'] },
    match_format: { type: 'string', enum: ['stroke_play', 'match_play'] },
    scoring_format: { type: 'string', enum: ['net', 'gross'] }
  }
};

export const matchGameSchema = {
  type: 'object',
  properties: {
    game_number: { type: 'integer', minimum: 1 },
    home_player_id: { type: 'string', format: 'uuid' },
    away_player_id: { type: 'string', format: 'uuid' },
    home_score: { type: 'integer', nullable: true },
    away_score: { type: 'integer', nullable: true },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
  },
  required: ['game_number', 'home_player_id', 'away_player_id']
};

export const scoreUpdateSchema = {
  type: 'object',
  properties: {
    home_score: { type: 'integer' },
    away_score: { type: 'integer' }
  },
  required: ['home_score', 'away_score']
};

export const submitMatchResultsSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['in_progress', 'completed', 'cancelled'] },
    games: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          home_player_id: { type: 'string', format: 'uuid' },
          away_player_id: { type: 'string', format: 'uuid' },
          home_score: { type: 'integer', minimum: 0 },
          away_score: { type: 'integer', minimum: 0 }
        },
        required: ['home_player_id', 'away_player_id', 'home_score', 'away_score']
      }
    }
  },
  required: ['status', 'games']
};

export const matchParamsSchema = {
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
  },
  required: ['error']
};

export const successMessageSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' }
  },
  required: ['message']
};

export const createdMatchResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    id: { type: 'string', format: 'uuid' }
  },
  required: ['message', 'id']
};
