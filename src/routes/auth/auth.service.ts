import { Kysely } from 'kysely';
import { Database } from '../../types/database';
import { UserWithRoles, AuthResult } from './auth.types';
import { UserRole } from '../../types/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '../email/email.service';

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
   * Create a password reset challenge and send email
   * @param email User's email address
   * @returns Success status and message
   */
  async createPasswordResetChallenge(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await this.db.selectFrom('users')
        .select(['id', 'username', 'email'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        // For security reasons, don't reveal that the email doesn't exist
        return { success: true, message: 'If your email is registered, you will receive a password reset code.' };
      }

      // Generate a random 6-digit code
      const challengeCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      // Create or update password reset challenge
      await this.db.insertInto('password_reset_challenges')
        .values({
          id: uuidv4(),
          user_id: user.id,
          email: user.email,
          challenge_code: challengeCode,
          expires_at: expiresAt,
          used: false
        })
        .execute();

      // Send email with code
      await emailService.sendPasswordResetEmail({
        recipientEmail: user.email,
        username: user.username,
        challengeCode
      });

      return { success: true, message: 'If your email is registered, you will receive a password reset code.' };
    } catch (error) {
      console.error('Error creating password reset challenge:', error);
      return { success: false, message: 'Failed to process password reset request. Please try again later.' };
    }
  }

  /**
   * Verify challenge code and reset password
   * @param email User's email address
   * @param challengeCode The 6-digit challenge code
   * @param newPassword The new password to set
   * @returns Success status and message
   */
  async verifyAndResetPassword(email: string, challengeCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find the latest challenge for this email
      const challenge = await this.db.selectFrom('password_reset_challenges')
        .selectAll()
        .where('email', '=', email)
        .where('challenge_code', '=', challengeCode)
        .where('used', '=', false)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (!challenge) {
        return { success: false, message: 'Invalid or expired code. Please request a new code.' };
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await this.db.updateTable('users')
        .set({ password_hash: hashedPassword })
        .where('id', '=', challenge.user_id)
        .execute();

      // Mark the challenge as used
      await this.db.updateTable('password_reset_challenges')
        .set({ used: true })
        .where('id', '=', challenge.id)
        .execute();

      return { success: true, message: 'Password has been reset successfully. You can now log in with your new password.' };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, message: 'Failed to reset password. Please try again later.' };
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