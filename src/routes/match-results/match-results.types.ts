import { Static, Type } from '@sinclair/typebox';

// Basic match result submission schema
export const matchResultSubmissionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  match_id: Type.String({ format: 'uuid' }),
  team_id: Type.String({ format: 'uuid' }),
  user_id: Type.String({ format: 'uuid' }),
  home_team_score: Type.Integer({ minimum: 0 }),
  away_team_score: Type.Integer({ minimum: 0 }),
  notes: Type.Optional(Type.String()),
  status: Type.Enum({
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected'
  }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// List of match result submissions
export const matchResultSubmissionListSchema = Type.Array(matchResultSubmissionSchema);

// Schema for creating a new match result submission
export const createMatchResultSubmissionSchema = Type.Object({
  match_id: Type.String({ format: 'uuid' }),
  home_team_score: Type.Integer({ minimum: 0 }),
  away_team_score: Type.Integer({ minimum: 0 }),
  notes: Type.Optional(Type.String())
});

// Schema for updating a match result submission status (for managers)
export const updateMatchResultSubmissionSchema = Type.Object({
  status: Type.Enum({
    approved: 'approved',
    rejected: 'rejected'
  }),
  notes: Type.Optional(Type.String())
});

// Request parameter schemas
export const matchIdParamsSchema = Type.Object({
  match_id: Type.String({ format: 'uuid' })
});

export const submissionIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

// Response for conflict scenario
export const conflictResponseSchema = Type.Object({
  conflict: Type.Boolean(),
  team1_submission: Type.Object({
    team_id: Type.String({ format: 'uuid' }),
    team_name: Type.String(),
    home_team_score: Type.Integer(),
    away_team_score: Type.Integer()
  }),
  team2_submission: Type.Object({
    team_id: Type.String({ format: 'uuid' }),
    team_name: Type.String(),
    home_team_score: Type.Integer(),
    away_team_score: Type.Integer()
  })
});

// Generic response schemas
export const errorResponseSchema = Type.Object({
  error: Type.String()
});

export const successMessageSchema = Type.Object({
  message: Type.String()
});

// Types derived from schemas
export type MatchResultSubmission = Static<typeof matchResultSubmissionSchema>;
export type CreateMatchResultSubmissionBody = Static<typeof createMatchResultSubmissionSchema>;
export type UpdateMatchResultSubmissionBody = Static<typeof updateMatchResultSubmissionSchema>;
export type MatchIdParams = Static<typeof matchIdParamsSchema>;
export type SubmissionIdParams = Static<typeof submissionIdParamsSchema>;
export type ConflictResponse = Static<typeof conflictResponseSchema>; 