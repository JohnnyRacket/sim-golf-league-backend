import { Static, Type } from '@sinclair/typebox';

// Basic notification schema
export const notificationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  user_id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  body: Type.String(),
  type: Type.Enum({
    league_invite: 'league_invite',
    team_invite: 'team_invite',
    match_reminder: 'match_reminder',
    match_result: 'match_result',
    team_join_request: 'team_join_request',
    league_join_request: 'league_join_request',
    system_message: 'system_message'
  }),
  action_id: Type.Optional(Type.String({ format: 'uuid' })),
  is_read: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// Notification list schema
export const notificationListSchema = Type.Array(notificationSchema);

// Schema for creating a new notification
export const createNotificationSchema = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  body: Type.String(),
  type: Type.Enum({
    league_invite: 'league_invite',
    team_invite: 'team_invite',
    match_reminder: 'match_reminder',
    match_result: 'match_result',
    team_join_request: 'team_join_request',
    league_join_request: 'league_join_request',
    system_message: 'system_message'
  }),
  action_id: Type.Optional(Type.String({ format: 'uuid' }))
});

// Schema for updating notification read status
export const updateNotificationSchema = Type.Object({
  is_read: Type.Boolean()
});

// Request parameter schemas
export const notificationIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

// Generic response schemas
export const errorResponseSchema = Type.Object({
  error: Type.String()
});

export const successMessageSchema = Type.Object({
  message: Type.String()
});

// Types derived from schemas
export type Notification = Static<typeof notificationSchema>;
export type CreateNotificationBody = Static<typeof createNotificationSchema>;
export type UpdateNotificationBody = Static<typeof updateNotificationSchema>; 