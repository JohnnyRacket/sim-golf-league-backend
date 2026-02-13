import { Static, Type } from '@sinclair/typebox';

export const setHandicapSchema = Type.Object({
  handicap_index: Type.Number({ minimum: -10, maximum: 54 }),
  effective_date: Type.Optional(Type.String({ format: 'date' })),
});

export const setTeamHandicapSchema = Type.Object({
  team_handicap: Type.Number({ minimum: -10, maximum: 54 }),
});

export const playerHandicapSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  user_id: Type.String({ format: 'uuid' }),
  username: Type.String(),
  handicap_index: Type.Number(),
  effective_date: Type.String({ format: 'date' }),
  updated_at: Type.String({ format: 'date-time' }),
});

export const handicapHistorySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  handicap_index: Type.Number(),
  effective_date: Type.String({ format: 'date' }),
  created_at: Type.String({ format: 'date-time' }),
});

export const teamHandicapSchema = Type.Object({
  team_id: Type.String({ format: 'uuid' }),
  team_name: Type.String(),
  team_handicap: Type.Union([Type.Number(), Type.Null()]),
  handicap_mode: Type.String(),
});

export const leagueIdParamsSchema = Type.Object({
  leagueId: Type.String({ format: 'uuid' }),
});

export const leagueUserIdParamsSchema = Type.Object({
  leagueId: Type.String({ format: 'uuid' }),
  userId: Type.String({ format: 'uuid' }),
});

export const teamIdParamsSchema = Type.Object({
  teamId: Type.String({ format: 'uuid' }),
});

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});

export const successMessageSchema = Type.Object({
  message: Type.String(),
});

export type SetHandicapBody = Static<typeof setHandicapSchema>;
export type SetTeamHandicapBody = Static<typeof setTeamHandicapSchema>;
