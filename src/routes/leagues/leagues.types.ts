import { LeagueStatus } from '../../types/database';

// League data types
export interface LeagueBasic {
  id: string;
  name: string;
  location_id: string;
  start_date: Date;
  end_date: Date;
  description?: string;
  max_teams: number;
  simulator_settings?: Record<string, any>;
  status: LeagueStatus;
  created_at: Date;
  updated_at: Date;
}

export interface LocationInfo {
  id: string;
  name: string;
  address: string;
}

export interface ManagerInfo {
  id: string;
  name: string;
  user_id: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  max_members: number;
  member_count: number;
}

export interface LeagueDetail extends LeagueBasic {
  location: LocationInfo;
  manager: ManagerInfo;
  teams: TeamInfo[];
}

export interface LeagueWithLocation extends LeagueBasic {
  location_name: string;
  manager_name: string;
}

// Request/Response types
export interface CreateLeagueBody {
  name: string;
  location_id: string;
  start_date: string;
  end_date: string;
  description?: string;
  max_teams?: number;
  simulator_settings?: Record<string, any>;
  status?: LeagueStatus;
}

export interface UpdateLeagueBody {
  name?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  max_teams?: number;
  simulator_settings?: Record<string, any>;
  status?: LeagueStatus;
}

// Schema definitions
export const leagueSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    location_id: { type: 'string', format: 'uuid' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    description: { type: 'string' },
    max_teams: { type: 'integer', minimum: 1 },
    simulator_settings: {
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['pending', 'active', 'completed'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'location_id', 'start_date', 'end_date', 'status']
};

export const locationInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    address: { type: 'string' }
  },
  required: ['id', 'name', 'address']
};

export const managerInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    user_id: { type: 'string', format: 'uuid' }
  },
  required: ['id', 'name', 'user_id']
};

export const teamInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    member_count: { type: 'integer', minimum: 0 }
  },
  required: ['id', 'name', 'max_members', 'member_count']
};

export const leagueDetailSchema = {
  type: 'object',
  properties: {
    ...leagueSchema.properties,
    location: locationInfoSchema,
    manager: managerInfoSchema,
    teams: {
      type: 'array',
      items: teamInfoSchema
    }
  },
  required: [...leagueSchema.required, 'location', 'manager', 'teams']
};

export const leagueWithLocationSchema = {
  type: 'object',
  properties: {
    ...leagueSchema.properties,
    location_name: { type: 'string' },
    manager_name: { type: 'string' }
  },
  required: [...leagueSchema.required, 'location_name', 'manager_name']
};

export const userLeagueMembershipSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['pending', 'active', 'completed'] },
    location_name: { type: 'string' },
    team_id: { type: 'string', format: 'uuid' },
    team_name: { type: 'string' }
  },
  required: ['id', 'name', 'start_date', 'end_date', 'status', 'team_id', 'team_name']
};

export const leagueStandingsSchema = {
  type: 'object',
  properties: {
    league: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'active', 'completed'] }
      },
      required: ['id', 'name', 'status']
    },
    standings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          team_id: { type: 'string', format: 'uuid' },
          team_name: { type: 'string' },
          matches_played: { type: 'integer', minimum: 0 },
          wins: { type: 'integer', minimum: 0 },
          losses: { type: 'integer', minimum: 0 },
          draws: { type: 'integer', minimum: 0 },
          points: { type: 'integer', minimum: 0 }
        },
        required: ['team_id', 'team_name', 'matches_played', 'wins', 'losses', 'draws', 'points']
      }
    }
  },
  required: ['league', 'standings']
};

export const createLeagueSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    location_id: { type: 'string', format: 'uuid' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    description: { type: 'string' },
    max_teams: { type: 'integer', minimum: 1 },
    simulator_settings: {
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['pending', 'active', 'completed'] }
  },
  required: ['name', 'location_id', 'start_date', 'end_date']
};

export const updateLeagueSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    description: { type: 'string' },
    max_teams: { type: 'integer', minimum: 1 },
    simulator_settings: {
      type: 'object',
      additionalProperties: true
    },
    status: { type: 'string', enum: ['pending', 'active', 'completed'] }
  }
};

export const leagueParamsSchema = {
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