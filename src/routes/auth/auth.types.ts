import { UserRole } from '../../types/database';

// Interface for login request
export interface LoginBody {
  email: string;
  password: string;
}

// Interface for registration request
export interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

// Interface for authentication result
export interface AuthResult {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

// Interface for user with roles
export interface UserWithRoles {
  id: string;
  username: string;
  email: string;
  roles: UserRole[];
}

// Schema definitions
export const loginSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string' }
  },
  required: ['email', 'password']
};

export const registerSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 }
  },
  required: ['username', 'email', 'password']
};

export const tokenResponseSchema = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' }
      }
    }
  }
};

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
}; 