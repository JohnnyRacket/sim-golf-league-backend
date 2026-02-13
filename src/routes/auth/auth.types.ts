import { Type } from '@sinclair/typebox';

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

// Schema definitions
export const loginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6 })
});

export const registerSchema = Type.Object({
  username: Type.String({ minLength: 3 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6 })
});

export const tokenResponseSchema = Type.Object({
  token: Type.String(),
  user: Type.Object({
    id: Type.String(),
    username: Type.String()
  })
});

export const errorResponseSchema = Type.Object({
  error: Type.String()
});

// Password reset request schema
export interface RequestPasswordResetBody {
  email: string;
}

export const requestPasswordResetSchema = Type.Object({
  email: Type.String({ format: 'email' })
});

// Password reset verification schema
export interface VerifyPasswordResetBody {
  email: string;
  challengeCode: string;
  newPassword: string;
}

export const verifyPasswordResetSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  challengeCode: Type.String({ minLength: 6, maxLength: 6 }),
  newPassword: Type.String({ minLength: 6 })
});

export const successResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
}); 