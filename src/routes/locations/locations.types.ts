import { HandednessType } from '../../types/database';
import { BayBasic } from './locations.service';

// Location data types
export interface LocationBasic {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  logo_url?: string | null;
  banner_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  coordinates?: { x: number; y: number } | null; // Store as {x, y} for latitude and longitude
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
  logo_url?: string | null;
  banner_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
}

export interface UpdateLocationBody {
  name?: string;
  address?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  coordinates?: { x: number; y: number } | null; // Used internally, not exposed in the API schema
}

// Schema definitions
export const locationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    address: { type: 'string' },
    owner_id: { type: 'string', format: 'uuid' },
    logo_url: { type: 'string', nullable: true },
    banner_url: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    coordinates: { 
      type: 'object', 
      nullable: true,
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      }
    },
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
    logo_url: { type: 'string', nullable: true },
    banner_url: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    coordinates: { 
      type: 'object', 
      nullable: true,
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      }
    },
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
    address: { type: 'string' },
    logo_url: { type: 'string', nullable: true },
    banner_url: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true }
  },
  required: ['name', 'address']
} as const;

export const updateLocationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' },
    logo_url: { type: 'string', nullable: true },
    banner_url: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true }
  }
} as const;

export const locationParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
} as const;

export interface LocationWithDetails {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  logo_url?: string | null;
  banner_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  coordinates?: { x: number; y: number } | null;
  owner?: {
    id: string;
    name: string;
    user_id: string;
  };
  league_count?: number;
  created_at: Date;
  updated_at: Date;
}

export const locationWithDetailsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    address: { type: 'string' },
    owner_id: { type: 'string', format: 'uuid' },
    logo_url: { type: 'string', nullable: true },
    banner_url: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    coordinates: { 
      type: 'object', 
      nullable: true,
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      }
    },
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

// Add bay schemas and types
export interface CreateBayBody {
  bay_number: string;
  max_people?: number;
  handedness?: HandednessType;
  details?: Record<string, unknown>;
}

export interface UpdateBayBody {
  bay_number?: string;
  max_people?: number;
  handedness?: HandednessType;
  details?: Record<string, unknown>;
}

export const baySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    location_id: { type: 'string', format: 'uuid' },
    bay_number: { type: 'string' },
    max_people: { type: 'integer', minimum: 1 },
    handedness: { type: 'string', enum: ['left', 'right', 'both'] },
    details: { 
      type: 'object',
      additionalProperties: true
    },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'location_id', 'bay_number', 'max_people', 'handedness']
};

export const createBaySchema = {
  type: 'object',
  properties: {
    bay_number: { type: 'string' },
    max_people: { type: 'integer', minimum: 1 },
    handedness: { type: 'string', enum: ['left', 'right', 'both'] },
    details: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['bay_number']
};

export const updateBaySchema = {
  type: 'object',
  properties: {
    bay_number: { type: 'string' },
    max_people: { type: 'integer', minimum: 1 },
    handedness: { type: 'string', enum: ['left', 'right', 'both'] },
    details: {
      type: 'object',
      additionalProperties: true
    }
  }
};

export const bayParamsSchema = {
  type: 'object',
  properties: {
    locationId: { type: 'string', format: 'uuid' },
    bayId: { type: 'string', format: 'uuid' }
  },
  required: ['locationId', 'bayId']
}; 