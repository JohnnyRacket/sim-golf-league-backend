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
}

export interface UpdateMatchBody {
  match_date?: string;
  simulator_settings?: Record<string, any>;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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

// API Schema definitions
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
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    player_details: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'league_id', 'home_team_id', 'away_team_id', 'match_date', 'status', 'player_details']
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
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }
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
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }
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
