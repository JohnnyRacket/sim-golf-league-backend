import { Static, Type } from '@sinclair/typebox';

// Basic user info (for lists, etc.)
export const userBasicSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  first_name: Type.Union([Type.String(), Type.Null()]),
  last_name: Type.Union([Type.String(), Type.Null()]),
  avatar_url: Type.Union([Type.String(), Type.Null()]),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// Extended user profile info (for /me)
export const userProfileSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  role: Type.String(),
  first_name: Type.Union([Type.String(), Type.Null()]),
  last_name: Type.Union([Type.String(), Type.Null()]),
  phone: Type.Union([Type.String(), Type.Null()]),
  avatar_url: Type.Union([Type.String(), Type.Null()]),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
  is_owner: Type.Boolean(),
  owner_details: Type.Optional(Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String()
  }))
});

// List of users
export const userListSchema = Type.Array(userBasicSchema);

// Schema for updating user data
export const updateUserSchema = Type.Object({
  username: Type.Optional(Type.String()),
  email: Type.Optional(Type.String({ format: 'email' })),
  first_name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  last_name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  avatar_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

// Schema for user teams (used in dashboard)
const userTeamSchema = Type.Object({
  team_id: Type.String({ format: 'uuid' }),
  team_name: Type.String(),
  member_role: Type.String(),
  league_id: Type.String({ format: 'uuid' }),
  league_name: Type.String(),
  league_status: Type.String()
});

// Schema for user matches (base, used in dashboard)
const userMatchBaseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  match_date: Type.String({ format: 'date-time' }),
  status: Type.String(),
  home_team_id: Type.String({ format: 'uuid' }),
  home_team_name: Type.String(),
  away_team_id: Type.String({ format: 'uuid' }),
  away_team_name: Type.String()
});

// Schema for user matches with score (used in dashboard)
const userMatchWithScoreSchema = Type.Intersect([
  userMatchBaseSchema,
  Type.Object({
    home_team_score: Type.Integer(),
    away_team_score: Type.Integer()
  })
]);

// Schema for user stats (placeholder for now)
const userStatsSchema = Type.Object({
  matches_played: Type.Integer(),
  matches_won: Type.Integer(),
  average_score: Type.Number(),
  handicap: Type.Number()
});


// Schema for the dashboard data
export const userDashboardSchema = Type.Object({
  // user_id: Type.String({ format: 'uuid' }), // Add if needed
  teams: Type.Array(userTeamSchema),
  upcoming_matches: Type.Array(userMatchBaseSchema),
  recent_matches: Type.Array(userMatchWithScoreSchema),
  league_summaries: Type.Array(Type.Any()), // Adjust if league summaries are implemented
});

// Request parameter schemas
export const userIdParamsSchema = Type.Object({
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
export type UserBasic = Static<typeof userBasicSchema>;
export type UserProfile = Static<typeof userProfileSchema>;
export type UpdateUserBody = Static<typeof updateUserSchema>;
export type UserDashboard = Static<typeof userDashboardSchema>; 