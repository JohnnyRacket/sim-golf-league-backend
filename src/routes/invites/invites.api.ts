import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { checkLeagueRole } from '../../middleware/auth';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { InvitesService } from './invites.service';
import { AuditService } from '../../services/audit.service';
import {
  createInviteSchema,
  inviteListSchema,
  inviteSchema,
  acceptInviteSchema,
  leagueIdParamsSchema,
  inviteIdParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  CreateInviteBody,
  AcceptInviteBody,
} from './invites.types';

export async function inviteRoutes(fastify: FastifyInstance) {
  const invitesService = new InvitesService(db);
  const notificationsService = new NotificationsService(db);
  const emailService = new EmailService();
  const auditService = new AuditService(db);

  // Create an invite (league managers only)
  fastify.post<{ Body: CreateInviteBody }>('/', {
    preHandler: checkLeagueRole('league_id', ['manager'], 'body'),
    schema: {
      body: createInviteSchema,
      response: {
        201: inviteSchema,
        409: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { league_id, recipient_email, role = 'player' } = request.body;
    const inviterId = request.user.id.toString();

    const result = await invitesService.createInvite({
      leagueId: league_id,
      inviterId,
      recipientEmail: recipient_email,
      role,
    });

    // Get league name for notifications/emails
    const league = await db.selectFrom('leagues')
      .select('name')
      .where('id', '=', league_id)
      .executeTakeFirst();

    const leagueName = league?.name || 'a league';

    if (result.recipient_is_existing_user && result.recipient_user_id) {
      // Send in-app notification
      await notificationsService.createNotification({
        user_id: result.recipient_user_id,
        title: `League Invite: ${leagueName}`,
        body: `You've been invited to join ${leagueName} as a ${role}. Check your invites to accept.`,
        type: 'league_invite',
        action_id: league_id,
      });
    }

    // Send email to all invitees
    await emailService.sendEmail({
      title: `You're invited to join ${leagueName}`,
      message: `
        <h2>You've been invited!</h2>
        <p>${request.user.username} has invited you to join <strong>${leagueName}</strong> as a <strong>${role}</strong>.</p>
        <p>${result.recipient_is_existing_user
          ? 'Log in to your account to accept the invite.'
          : 'Create an account to get started.'
        }</p>
        <p>This invite expires in 7 days.</p>
      `,
      users: [{ email: recipient_email }],
    });

    // Fetch the full invite with joins for response
    const invites = await invitesService.getLeagueInvites(league_id);
    const created = invites.find(i => i.id === result.id);

    reply.code(201).send(created);
  });

  // Get pending invites for a league (league managers only)
  fastify.get<{ Params: { leagueId: string } }>('/league/:leagueId', {
    preHandler: checkLeagueRole('leagueId', ['manager']),
    schema: {
      params: leagueIdParamsSchema,
      response: {
        200: inviteListSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request) => {
    return invitesService.getLeagueInvites(request.params.leagueId);
  });

  // Get my pending invites
  fastify.get('/my', {
    schema: {
      response: {
        200: inviteListSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request) => {
    return invitesService.getUserInvites(request.user.email);
  });

  // Accept an invite
  fastify.post<{ Body: AcceptInviteBody }>('/accept', {
    schema: {
      body: acceptInviteSchema,
      response: {
        200: successMessageSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { invite_code } = request.body;
    const userId = request.user.id.toString();

    const result = await invitesService.acceptInvite(invite_code, userId);

    auditService.log({
      user_id: userId,
      action: "invite.accept",
      entity_type: "league_invite",
      entity_id: result.league_id,
      details: { role: result.role },
      ip_address: request.ip,
    });

    reply.send({
      message: `Successfully joined league as ${result.role}`,
    });
  });

  // Revoke an invite (league managers only)
  fastify.delete<{ Params: { inviteId: string } }>('/:inviteId', {
    schema: {
      params: inviteIdParamsSchema,
      response: {
        200: successMessageSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    // We need to look up the invite to check league ownership
    const invite = await db.selectFrom('league_invites')
      .select(['league_id'])
      .where('id', '=', request.params.inviteId)
      .executeTakeFirst();

    if (!invite) {
      reply.code(404).send({ error: 'Invite not found' });
      return;
    }

    // Verify user is league manager via JWT
    const leagueId = invite.league_id;
    const userLeagues = request.user.leagues || {};
    const isManager = userLeagues[leagueId] === 'manager';
    const isAdmin = request.user.platform_role === 'admin';

    if (!isManager && !isAdmin) {
      reply.code(403).send({ error: 'Not authorized to revoke this invite' });
      return;
    }

    await invitesService.revokeInvite(request.params.inviteId);

    auditService.log({
      user_id: request.user.id.toString(),
      action: "invite.revoke",
      entity_type: "league_invite",
      entity_id: request.params.inviteId,
      details: { league_id: leagueId },
      ip_address: request.ip,
    });

    reply.send({ message: 'Invite revoked' });
  });

  // Public: look up invite by code (for registration pre-fill)
  // This is registered separately in the auth routes as it doesn't need auth
}
