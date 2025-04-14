import { TeamStatus, TeamMemberRole } from '../../types/database';

// Team data types
export interface TeamBasic {
  id: string;
  league_id: string;
  name: string;
  max_members: number;
  status: TeamStatus;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: TeamMemberRole;
  status: string;
  username: string;
}

export interface TeamDetail extends TeamBasic {
  members: TeamMember[];
}

export interface TeamWithMemberCount extends TeamBasic {
  member_count: number;
  league_id: string;
  league_name: string;
  location_name: string;
  role: TeamMemberRole;
}

export interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: Date;
  username: string;
  team_name?: string;
}

// Request/Response types
export interface CreateTeamBody {
  league_id: string;
  name: string;
  max_members?: number;
  status?: 'active' | 'inactive';
}

export interface UpdateTeamBody {
  name?: string;
  max_members?: number;
  status?: 'active' | 'inactive';
}

export interface TeamMemberBody {
  user_id: string;
  role?: 'member';
}

export interface JoinRequestBody {
  team_id: string;
}

export interface MemberRoleUpdateBody {
  role: 'member';
}

// Common response schemas
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

export const createdTeamResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    id: { type: 'string', format: 'uuid' }
  },
  required: ['message', 'id']
};

// Component schemas
export const teamMemberSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['member', 'captain'] },
    status: { type: 'string', enum: ['active', 'inactive'] },
    username: { type: 'string' }
  },
  required: ['id', 'user_id', 'role', 'status', 'username']
};

export const joinRequestSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    team_id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
    created_at: { type: 'string', format: 'date-time' },
    username: { type: 'string' },
    team_name: { type: 'string' }
  },
  required: ['id', 'team_id', 'user_id', 'status', 'created_at', 'username']
};

// API schema definitions
export const teamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    league_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'league_id', 'name', 'max_members', 'status']
};

export const teamDetailSchema = {
  type: 'object',
  properties: {
    ...teamSchema.properties,
    members: {
      type: 'array',
      items: teamMemberSchema
    }
  },
  required: [...teamSchema.required, 'members']
};

export const teamWithMemberCountSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    league_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    member_count: { type: 'integer', minimum: 0 },
    league_name: { type: 'string' },
    location_name: { type: 'string' },
    role: { type: 'string', enum: ['member', 'captain'] }
  },
  required: ['id', 'league_id', 'name', 'max_members', 'status', 'member_count', 'league_name', 'location_name', 'role']
};

export const joinRequestBodySchema = {
  type: 'object',
  properties: {
    team_id: { type: 'string', format: 'uuid' }
  },
  required: ['team_id']
};

export const createTeamSchema = {
  type: 'object',
  properties: {
    league_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] }
  },
  required: ['league_id', 'name']
};

export const updateTeamSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    max_members: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['active', 'inactive'] }
  }
};

export const teamMemberBodySchema = {
  type: 'object',
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['member'] }
  },
  required: ['user_id']
};

export const memberRoleUpdateSchema = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: ['member'] }
  },
  required: ['role']
};

export const memberResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    member: teamMemberSchema
  },
  required: ['message', 'member']
};

export const joinRequestResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    request_id: { type: 'string', format: 'uuid' }
  },
  required: ['message', 'request_id']
};

export const teamIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
};

export const teamMemberIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    memberId: { type: 'string', format: 'uuid' }
  },
  required: ['id', 'memberId']
};

export const joinRequestIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    requestId: { type: 'string', format: 'uuid' }
  },
  required: ['id', 'requestId']
}; 