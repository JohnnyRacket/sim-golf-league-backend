import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Database, LeagueMemberRole } from '../../types/database';
import { DatabaseError, NotFoundError, ValidationError, ConflictError } from '../../utils/errors';

export class InvitesService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Create an invite for a user to join a league
   */
  async createInvite(data: {
    leagueId: string;
    inviterId: string;
    recipientEmail: string;
    role: LeagueMemberRole;
  }) {
    const { leagueId, inviterId, recipientEmail, role } = data;

    // Check if there's already a pending invite for this email + league
    const existing = await this.db.selectFrom('league_invites')
      .select('id')
      .where('league_id', '=', leagueId)
      .where('recipient_email', '=', recipientEmail.toLowerCase())
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (existing) {
      throw new ConflictError('An invite for this email already exists for this league');
    }

    // Check if the recipient is already a league member
    const recipientUser = await this.db.selectFrom('users')
      .select('id')
      .where('email', '=', recipientEmail.toLowerCase())
      .executeTakeFirst();

    if (recipientUser) {
      const existingMember = await this.db.selectFrom('league_members')
        .select('id')
        .where('league_id', '=', leagueId)
        .where('user_id', '=', recipientUser.id)
        .executeTakeFirst();

      if (existingMember) {
        throw new ConflictError('This user is already a member of the league');
      }
    }

    const inviteCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.db.insertInto('league_invites')
      .values({
        id: uuidv4(),
        league_id: leagueId,
        inviter_id: inviterId,
        recipient_email: recipientEmail.toLowerCase(),
        recipient_user_id: recipientUser?.id ?? null,
        role,
        status: 'pending',
        invite_code: inviteCode,
        expires_at: expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...invite,
      recipient_is_existing_user: !!recipientUser,
    };
  }

  /**
   * Get all pending invites for a league
   */
  async getLeagueInvites(leagueId: string) {
    return this.db.selectFrom('league_invites')
      .innerJoin('users as inviter', 'inviter.id', 'league_invites.inviter_id')
      .innerJoin('leagues', 'leagues.id', 'league_invites.league_id')
      .select([
        'league_invites.id',
        'league_invites.league_id',
        'leagues.name as league_name',
        'league_invites.inviter_id',
        'inviter.username as inviter_username',
        'league_invites.recipient_email',
        'league_invites.recipient_user_id',
        'league_invites.role',
        'league_invites.status',
        'league_invites.invite_code',
        'league_invites.expires_at',
        'league_invites.created_at',
      ])
      .where('league_invites.league_id', '=', leagueId)
      .where('league_invites.status', '=', 'pending')
      .orderBy('league_invites.created_at', 'desc')
      .execute();
  }

  /**
   * Get pending invites for the current user (by email)
   */
  async getUserInvites(userEmail: string) {
    return this.db.selectFrom('league_invites')
      .innerJoin('users as inviter', 'inviter.id', 'league_invites.inviter_id')
      .innerJoin('leagues', 'leagues.id', 'league_invites.league_id')
      .select([
        'league_invites.id',
        'league_invites.league_id',
        'leagues.name as league_name',
        'league_invites.inviter_id',
        'inviter.username as inviter_username',
        'league_invites.recipient_email',
        'league_invites.recipient_user_id',
        'league_invites.role',
        'league_invites.status',
        'league_invites.invite_code',
        'league_invites.expires_at',
        'league_invites.created_at',
      ])
      .where('league_invites.recipient_email', '=', userEmail.toLowerCase())
      .where('league_invites.status', '=', 'pending')
      .where('league_invites.expires_at', '>', new Date())
      .orderBy('league_invites.created_at', 'desc')
      .execute();
  }

  /**
   * Accept an invite (by invite code or invite ID for authenticated users)
   */
  async acceptInvite(inviteCode: string, userId: string) {
    const invite = await this.db.selectFrom('league_invites')
      .selectAll()
      .where('invite_code', '=', inviteCode)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!invite) {
      throw new NotFoundError('Invite not found or already used');
    }

    if (invite.expires_at < new Date()) {
      // Mark as expired
      await this.db.updateTable('league_invites')
        .set({ status: 'expired' })
        .where('id', '=', invite.id)
        .execute();
      throw new ValidationError('This invite has expired');
    }

    // Verify the accepting user's email matches the invite
    const user = await this.db.selectFrom('users')
      .select(['id', 'email'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user || user.email.toLowerCase() !== invite.recipient_email.toLowerCase()) {
      throw new ValidationError('This invite was sent to a different email address');
    }

    // Check if user is already a member
    const existingMember = await this.db.selectFrom('league_members')
      .select('id')
      .where('league_id', '=', invite.league_id)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (existingMember) {
      // Mark invite as accepted anyway
      await this.db.updateTable('league_invites')
        .set({ status: 'accepted' })
        .where('id', '=', invite.id)
        .execute();
      throw new ConflictError('You are already a member of this league');
    }

    // Add user to league
    await this.db.insertInto('league_members')
      .values({
        id: uuidv4(),
        league_id: invite.league_id,
        user_id: userId,
        role: invite.role,
      })
      .execute();

    // Mark invite as accepted
    await this.db.updateTable('league_invites')
      .set({ status: 'accepted', recipient_user_id: userId })
      .where('id', '=', invite.id)
      .execute();

    return {
      league_id: invite.league_id,
      role: invite.role,
    };
  }

  /**
   * Accept invites by email during registration (auto-join)
   */
  async acceptPendingInvitesForEmail(email: string, userId: string) {
    const pendingInvites = await this.db.selectFrom('league_invites')
      .selectAll()
      .where('recipient_email', '=', email.toLowerCase())
      .where('status', '=', 'pending')
      .where('expires_at', '>', new Date())
      .execute();

    for (const invite of pendingInvites) {
      // Check not already a member (shouldn't happen for new registration, but safety)
      const existingMember = await this.db.selectFrom('league_members')
        .select('id')
        .where('league_id', '=', invite.league_id)
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (!existingMember) {
        await this.db.insertInto('league_members')
          .values({
            id: uuidv4(),
            league_id: invite.league_id,
            user_id: userId,
            role: invite.role,
          })
          .execute();
      }

      await this.db.updateTable('league_invites')
        .set({ status: 'accepted', recipient_user_id: userId })
        .where('id', '=', invite.id)
        .execute();
    }

    return pendingInvites.length;
  }

  /**
   * Revoke/cancel a pending invite
   */
  async revokeInvite(inviteId: string) {
    const result = await this.db.deleteFrom('league_invites')
      .where('id', '=', inviteId)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!result || result.numDeletedRows === BigInt(0)) {
      throw new NotFoundError('Invite not found or already processed');
    }

    return true;
  }

  /**
   * Look up an invite by code (for pre-filling registration)
   */
  async getInviteByCode(inviteCode: string) {
    const invite = await this.db.selectFrom('league_invites')
      .innerJoin('leagues', 'leagues.id', 'league_invites.league_id')
      .select([
        'league_invites.id',
        'league_invites.league_id',
        'leagues.name as league_name',
        'league_invites.recipient_email',
        'league_invites.role',
        'league_invites.status',
        'league_invites.expires_at',
      ])
      .where('league_invites.invite_code', '=', inviteCode)
      .executeTakeFirst();

    if (!invite) {
      throw new NotFoundError('Invite not found');
    }

    return invite;
  }
}
