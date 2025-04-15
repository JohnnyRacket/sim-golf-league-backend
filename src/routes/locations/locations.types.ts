// Location data types
export interface LocationBasic {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface OwnerInfo {
  id: string;
  name: string;
  user_id: string;
}

export interface LocationDetail extends LocationBasic {
  owner: OwnerInfo;
  league_count: number;
}

// Request/Response types
export interface CreateLocationBody {
  name: string;
  address: string;
}

export interface UpdateLocationBody {
  name?: string;
  address?: string;
}

// Schema definitions
export const locationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    address: { type: 'string' },
    owner_id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'address', 'owner_id']
} as const;

export const locationDetailSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    address: { type: 'string' },
    owner_id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    owner: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        user_id: { type: 'string', format: 'uuid' }
      }
    },
    league_count: { type: 'number' }
  },
  required: ['id', 'name', 'address', 'owner_id', 'owner']
};

export const createLocationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' }
  },
  required: ['name', 'address']
} as const;

export const updateLocationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' }
  }
} as const;

export const locationParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
} as const;

export const locationWithDetailsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    address: { type: 'string' },
    owner_id: { type: 'string', format: 'uuid' },
    owner: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        user_id: { type: 'string', format: 'uuid' }
      }
    },
    league_count: { type: 'number' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  }
} as const;

// Reusable error response schema
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
} as const;

// Success message schema
export const successMessageSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' }
  }
} as const;

// TypeScript interfaces
export interface LocationParams {
  id: string;
}

export interface LocationWithDetails {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    user_id: string;
  };
  league_count?: number;
  created_at: Date;
  updated_at: Date;
} 