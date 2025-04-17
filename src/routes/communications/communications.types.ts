import { Static, Type } from '@sinclair/typebox';
import { CommunicationType } from '../../types/enums';

// Basic communication schema
export const communicationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  sender_id: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  recipient_type: Type.Enum({
    league: 'league',
    team: 'team',
    user: 'user'
  }),
  recipient_id: Type.String({ format: 'uuid' }),
  type: Type.Enum({
    system: 'system',
    league: 'league',
    maintenance: 'maintenance',
    advertisement: 'advertisement',
    schedule: 'schedule'
  }),
  title: Type.String(),
  message: Type.String(),
  expiration_date: Type.Optional(Type.String({ format: 'date-time' })),
  sent_at: Type.String({ format: 'date-time' }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// Communication list schema
export const communicationListSchema = Type.Array(communicationSchema);

// Schema for creating a new communication
export const createCommunicationSchema = Type.Object({
  recipientType: Type.Enum({
    league: 'league',
    team: 'team',
    user: 'user'
  }),
  recipientId: Type.String({ format: 'uuid' }),
  type: Type.Enum({
    system: 'system',
    league: 'league',
    maintenance: 'maintenance',
    advertisement: 'advertisement',
    schedule: 'schedule'
  }),
  title: Type.String(),
  message: Type.String(),
  expirationDate: Type.Optional(Type.String({ format: 'date-time' })),
  senderId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()]))
});

// Request parameter schemas
export const communicationIdParamsSchema = Type.Object({
  id: Type.String()
});

export const leagueIdParamsSchema = Type.Object({
  leagueId: Type.String({ format: 'uuid' })
});

// Generic response schemas
export const errorResponseSchema = Type.Object({
  error: Type.String()
});

export const successResponseSchema = Type.Object({
  message: Type.String()
});

// Types derived from schemas
export type Communication = Static<typeof communicationSchema>;
export type CreateCommunicationBody = Static<typeof createCommunicationSchema>; 