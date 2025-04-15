import { Kysely } from 'kysely';
import { Database } from '../../types/database';
import { UserWithRoles, AuthResult } from './auth.types';
import { UserRole } from '../../types/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private db: Kysely<Database>;
  private jwtSecret: string;

  constructor(db: Kysely<Database>) {
    this.db = db;
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
  }

  /**
   * Authenticate a user with email and password
   */
  async loginUser(email: string, password: string): Promise<AuthResult | null> {
    try {
      // Find user by email
      const user = await this.db.selectFrom('users')
        .selectAll()
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        return null;
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return null;
      }

      // Get user roles
      const userWithRoles = await this.getUserWithRoles(user.id);
      
      // Generate JWT token
      const token = this.generateToken(userWithRoles);

      return { 
        token,
        user: {
          id: user.id,
          username: user.username
        }
      };
    } catch (error) {
      throw new Error(`Login failed: ${error}`);
    }
  }

  /**
   * Register a new user
   */
  async registerUser(username: string, email: string, password: string): Promise<AuthResult | null> {
    try {
      // Check if username or email already exists
      const existingUser = await this.db.selectFrom('users')
        .selectAll()
        .where((eb) => eb.or([
          eb('username', '=', username),
          eb('email', '=', email)
        ]))
        .executeTakeFirst();

      if (existingUser) {
        return null;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with UUID and role
      const userId = uuidv4();
      const result = await this.db.insertInto('users')
        .values({
          id: userId,
          username,
          email,
          password_hash: hashedPassword,
          role: 'user' as UserRole
        })
        .returning(['id', 'username', 'email', 'role'])
        .executeTakeFirst();

      if (!result) {
        throw new Error('Failed to create user');
      }

      // Create user with roles object
      const userWithRoles: UserWithRoles = {
        id: result.id,
        username: result.username,
        email: result.email,
        roles: [result.role]
      };
      
      // Generate JWT token
      const token = this.generateToken(userWithRoles);

      return { 
        token,
        user: {
          id: result.id,
          username: result.username
        }
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error}`);
    }
  }

  /**
   * Get user with all roles
   */
  private async getUserWithRoles(userId: string): Promise<UserWithRoles> {
    try {
      // Get user data
      const user = await this.db.selectFrom('users')
        .select(['id', 'username', 'email', 'role'])
        .where('id', '=', userId)
        .executeTakeFirst();

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is an owner
      const owner = await this.db.selectFrom('owners')
        .select('id')
        .where('user_id', '=', userId)
        .executeTakeFirst();

      // Prepare roles array
      const roles = [user.role];
      if (owner) {
        roles.push('owner' as unknown as UserRole);
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        roles
      };
    } catch (error) {
      throw new Error(`Failed to get user roles: ${error}`);
    }
  }

  /**
   * Generate JWT token for a user
   */
  private generateToken(user: UserWithRoles): string {
    return jwt.sign(
      { 
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
  }
} 