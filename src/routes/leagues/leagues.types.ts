import { LeagueStatus, LeagueMemberRole, LeagueRequestStatus, PaymentType, DayOfWeek, SchedulingFormatType, PlayoffFormatType } from '../../types/database';

// League data types
export interface LeagueBasic {
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
  start_time?: string;
  bays?: string[];
  scheduling_format: SchedulingFormatType;
  playoff_format: PlayoffFormatType;
  playoff_size: number;
  prize_breakdown?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface LocationInfo {
  id: string;
  name: string;
  address: string;
}

export interface OwnerInfo {
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

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  role: LeagueMemberRole;
  joined_at: Date;
  username: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface LeagueMembershipRequest {
  id: string;
  league_id: string;
  user_id: string;
  requested_role: LeagueMemberRole;
  status: LeagueRequestStatus;
  message?: string;
  created_at: Date;
  updated_at?: Date;
  username?: string;
  league_name?: string;
}

export interface LeagueDetail extends LeagueBasic {
  location: LocationInfo;
  owner: OwnerInfo;
  teams: TeamInfo[];
  members?: LeagueMember[];
}

export interface LeagueWithLocation extends LeagueBasic {
  location_name: string;
  owner_name: string;
}

// Request/Response types
export interface CreateLeagueBody {
  name: string;
  location_id: string;
  start_date: string;
  end_date: string;
  description?: string;
  max_teams?: number;
  simulator_settings?: Record<string, unknown>;
  status?: LeagueStatus;
  banner_image_url?: string;
  cost?: number;
  payment_type?: PaymentType;
  day_of_week?: DayOfWeek;
  start_time?: string;
  bays?: string[];
  scheduling_format?: SchedulingFormatType;
  playoff_format?: PlayoffFormatType;
  playoff_size?: number;
  prize_breakdown?: Record<string, unknown>;
  is_public?: boolean;
}

export interface UpdateLeagueBody {
  name?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  max_teams?: number;
  simulator_settings?: Record<string, unknown>;
  status?: LeagueStatus;
  banner_image_url?: string;
  cost?: number;
  payment_type?: PaymentType;
  day_of_week?: DayOfWeek;
  start_time?: string;
  bays?: string[];
  scheduling_format?: SchedulingFormatType;
  playoff_format?: PlayoffFormatType;
  playoff_size?: number;
  prize_breakdown?: Record<string, unknown>;
  is_public?: boolean;
}

export interface CreateMembershipRequestBody {
  league_id: string;
  requested_role: LeagueMemberRole;
  message?: string;
}

export interface UpdateLeagueMemberBody {
  role: LeagueMemberRole;
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
    banner_image_url: { type: 'string' },
    cost: { type: 'number' },
    payment_type: { type: 'string', enum: ['weekly', 'monthly', 'upfront', 'free'] },
    day_of_week: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    start_time: { type: 'string', format: 'time' },
    bays: { 
      type: 'array',
      items: { type: 'string', format: 'uuid' }
    },
    scheduling_format: { type: 'string', enum: ['round_robin', 'groups', 'swiss', 'ladder', 'custom'] },
    playoff_format: { type: 'string', enum: ['none', 'single_elimination', 'double_elimination', 'round_robin'] },
    playoff_size: { type: 'integer', minimum: 0 },
    prize_breakdown: {
      type: 'object',
      additionalProperties: true
    },
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

export const ownerInfoSchema = {
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

export const leagueMemberSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['player', 'spectator', 'manager'] },
    joined_at: { type: 'string', format: 'date-time' },
    username: { type: 'string' }
  },
  required: ['id', 'user_id', 'role', 'joined_at', 'username']
};

export const leagueMembershipRequestSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    requested_role: { type: 'string', enum: ['player', 'spectator', 'manager'] },
    status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
    message: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    username: { type: 'string' }
  },
  required: ['id', 'user_id', 'requested_role', 'status', 'created_at']
};

export const leagueDetailSchema = {
  type: 'object',
  properties: {
    ...leagueSchema.properties,
    location: locationInfoSchema,
    owner: ownerInfoSchema,
    teams: {
      type: 'array',
      items: teamInfoSchema
    },
    members: {
      type: 'array',
      items: leagueMemberSchema
    }
  },
  required: [...leagueSchema.required, 'location', 'owner', 'teams']
};

export const leagueWithLocationSchema = {
  type: 'object',
  properties: {
    ...leagueSchema.properties,
    location_name: { type: 'string' },
    owner_name: { type: 'string' }
  },
  required: [...leagueSchema.required, 'location_name', 'owner_name']
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
    team_name: { type: 'string' },
    role: { type: 'string', enum: ['player', 'spectator', 'manager'] }
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
    status: { type: 'string', enum: ['pending', 'active', 'completed'] },
    banner_image_url: { type: 'string' },
    cost: { type: 'number' },
    payment_type: { type: 'string', enum: ['weekly', 'monthly', 'upfront', 'free'] },
    day_of_week: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    start_time: { type: 'string', format: 'time' },
    bays: { 
      type: 'array',
      items: { type: 'string', format: 'uuid' }
    },
    scheduling_format: { type: 'string', enum: ['round_robin', 'groups', 'swiss', 'ladder', 'custom'] },
    playoff_format: { type: 'string', enum: ['none', 'single_elimination', 'double_elimination', 'round_robin'] },
    playoff_size: { type: 'integer', minimum: 0 },
    prize_breakdown: {
      type: 'object',
      additionalProperties: true
    },
    is_public: { type: 'boolean' }
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
    status: { type: 'string', enum: ['pending', 'active', 'completed'] },
    banner_image_url: { type: 'string' },
    cost: { type: 'number' },
    payment_type: { type: 'string', enum: ['weekly', 'monthly', 'upfront', 'free'] },
    day_of_week: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    start_time: { type: 'string', format: 'time' },
    bays: {
      type: 'array',
      items: { type: 'string', format: 'uuid' }
    },
    scheduling_format: { type: 'string', enum: ['round_robin', 'groups', 'swiss', 'ladder', 'custom'] },
    playoff_format: { type: 'string', enum: ['none', 'single_elimination', 'double_elimination', 'round_robin'] },
    playoff_size: { type: 'integer', minimum: 0 },
    prize_breakdown: {
      type: 'object',
      additionalProperties: true
    },
    is_public: { type: 'boolean' }
  }
};

export const createMembershipRequestSchema = {
  type: 'object',
  properties: {
    league_id: { type: 'string', format: 'uuid' },
    requested_role: { type: 'string', enum: ['player', 'spectator', 'manager'] },
    message: { type: 'string' }
  },
  required: ['league_id', 'requested_role']
};

export const updateLeagueMemberSchema = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: ['player', 'spectator', 'manager'] }
  },
  required: ['role']
};

export const leagueParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
};

export const memberParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    memberId: { type: 'string', format: 'uuid' }
  },
  required: ['id', 'memberId']
};

export const requestParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    requestId: { type: 'string', format: 'uuid' }
  },
  required: ['id', 'requestId']
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