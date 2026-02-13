import { Kysely } from 'kysely';
import { Database } from '../../types/database';
import { AuthResult } from './auth.types';
import { UserRole } from '../../types/database';
import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '../email/email.service';
import { signRichJWT } from '../../services/jwt.service';
import { InvitesService } from '../invites/invites.service';

export class AuthService {
  private db: Kysely<Database>;
  private invitesService: InvitesService;

  constructor(db: Kysely<Database>) {
    this.db = db;
    this.invitesService = new InvitesService(db);
  }

  /**
   * Authenticate a user with email and password.
   * Checks the account table (better-auth credential provider) first,
   * falls back to users.password_hash for backward compatibility.
   */
  async loginUser(email: string, password: string): Promise<AuthResult | null> {
    try {
      const user = await this.db.selectFrom('users')
        .select(['id', 'username', 'email', 'password_hash'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        return null;
      }

      // Try account table first (better-auth credential)
      const account = await this.db.selectFrom('account')
        .select(['password'])
        .where('user_id', '=', user.id)
        .where('provider_id', '=', 'credential')
        .executeTakeFirst();

      const hashToCheck = account?.password || user.password_hash;
      if (!hashToCheck) {
        return null;
      }

      const validPassword = await bcrypt.compare(password, hashToCheck);
      if (!validPassword) {
        return null;
      }

      const { token } = await signRichJWT(user.id);

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
   * Register a new user. Creates both a users row and an account row
   * (better-auth credential provider).
   */
  async registerUser(username: string, email: string, password: string): Promise<AuthResult | null> {
    try {
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

      const hashedPassword = await bcrypt.hash(password, 10);
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

      // Create account row for better-auth credential provider
      await this.db.insertInto('account')
        .values({
          id: uuidv4(),
          user_id: userId,
          account_id: userId,
          provider_id: 'credential',
          password: hashedPassword,
        })
        .execute();

      // Auto-accept any pending invites for this email
      await this.invitesService.acceptPendingInvitesForEmail(email, result.id);

      // Generate Rich JWT (includes any roles from accepted invites)
      const { token } = await signRichJWT(result.id);

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

      const { token } = await signRichJWT(userId);

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
      const user = await this.db.selectFrom('users')
        .select(['id', 'username', 'email'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        return { success: true, message: 'If your email is registered, you will receive a password reset code.' };
      }

      const challengeCode = randomInt(100000, 999999).toString();

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

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
   * Verify challenge code and reset password.
   * Updates both users.password_hash and account.password.
   */
  async verifyAndResetPassword(email: string, challengeCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
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

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update users table (backward compat)
      await this.db.updateTable('users')
        .set({ password_hash: hashedPassword })
        .where('id', '=', challenge.user_id)
        .execute();

      // Update account table (better-auth credential)
      await this.db.updateTable('account')
        .set({ password: hashedPassword })
        .where('user_id', '=', challenge.user_id)
        .where('provider_id', '=', 'credential')
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
