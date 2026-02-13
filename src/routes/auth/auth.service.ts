import { Kysely } from 'kysely';
import { Database } from '../../types/database';
import { AuthResult } from './auth.types';
import { UserRole } from '../../types/database';
import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '../email/email.service';
import { TokenService } from '../../services/token.service';

export class AuthService {
  private db: Kysely<Database>;
  private tokenService: TokenService;

  constructor(db: Kysely<Database>) {
    this.db = db;
    this.tokenService = new TokenService(db);
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

      // Generate Rich JWT with all entity-scoped roles
      const { token } = await this.tokenService.generateToken(user.id);

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

      // Generate Rich JWT (new user has no entity roles yet)
      const { token } = await this.tokenService.generateToken(result.id);

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
   * Refresh a user's JWT token with current roles.
   * Called when client needs updated roles (e.g., after being added to a league).
   */
  async refreshToken(userId: string): Promise<AuthResult | null> {
    try {
      const user = await this.db.selectFrom('users')
        .select(['id', 'username'])
        .where('id', '=', userId)
        .executeTakeFirst();

      if (!user) {
        return null;
      }

      const { token } = await this.tokenService.generateToken(userId);

      return {
        token,
        user: {
          id: user.id,
          username: user.username
        }
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error}`);
    }
  }

  /**
   * Create a password reset challenge and send email
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

      // Generate a cryptographically secure random 6-digit code
      const challengeCode = randomInt(100000, 999999).toString();

      // Set expiration time (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      // Create password reset challenge
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
}
