import { Static, Type } from '@sinclair/typebox';

export const createInviteSchema = Type.Object({
  league_id: Type.String({ format: 'uuid' }),
  recipient_email: Type.String({ format: 'email' }),
  role: Type.Optional(Type.Union([
    Type.Literal('player'),
    Type.Literal('spectator'),
    Type.Literal('manager')
  ]))
});

export const inviteSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  league_id: Type.String({ format: 'uuid' }),
  league_name: Type.String(),
  inviter_id: Type.String({ format: 'uuid' }),
  inviter_username: Type.String(),
  recipient_email: Type.String({ format: 'email' }),
  recipient_user_id: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  role: Type.String(),
  status: Type.String(),
  invite_code: Type.String(),
  expires_at: Type.String({ format: 'date-time' }),
  created_at: Type.String({ format: 'date-time' })
});

export const inviteListSchema = Type.Array(inviteSchema);

export const acceptInviteSchema = Type.Object({
  invite_code: Type.String()
});

export const leagueIdParamsSchema = Type.Object({
  leagueId: Type.String({ format: 'uuid' })
});

export const inviteIdParamsSchema = Type.Object({
  inviteId: Type.String({ format: 'uuid' })
});

export const errorResponseSchema = Type.Object({
  error: Type.String()
});

export const successMessageSchema = Type.Object({
  message: Type.String()
});

export type CreateInviteBody = Static<typeof createInviteSchema>;
export type AcceptInviteBody = Static<typeof acceptInviteSchema>;
