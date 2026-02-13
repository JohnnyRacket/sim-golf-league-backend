import { Static, Type } from "@sinclair/typebox";

export const createSeriesSchema = Type.Object({
  location_id: Type.String({ format: "uuid" }),
  name: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  start_date: Type.String({ format: "date" }),
  end_date: Type.String({ format: "date" }),
});

export const createSeriesFromLeagueSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  start_date: Type.Optional(Type.String({ format: "date" })),
  end_date: Type.Optional(Type.String({ format: "date" })),
});

export const updateSeriesSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  start_date: Type.Optional(Type.String({ format: "date" })),
  end_date: Type.Optional(Type.String({ format: "date" })),
  is_active: Type.Optional(Type.Boolean()),
});

export const seriesSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  location_id: Type.String({ format: "uuid" }),
  location_name: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  start_date: Type.String({ format: "date" }),
  end_date: Type.String({ format: "date" }),
  is_active: Type.Boolean(),
  league_count: Type.Integer(),
  created_at: Type.String({ format: "date-time" }),
});

export const seriesDetailSchema = Type.Intersect([
  seriesSchema,
  Type.Object({
    leagues: Type.Array(
      Type.Object({
        id: Type.String({ format: "uuid" }),
        name: Type.String(),
        status: Type.String(),
        start_date: Type.String({ format: "date" }),
        end_date: Type.String({ format: "date" }),
      }),
    ),
  }),
]);

export const locationIdParamsSchema = Type.Object({
  locationId: Type.String({ format: "uuid" }),
});

export const seriesIdParamsSchema = Type.Object({
  seriesId: Type.String({ format: "uuid" }),
});

export const leagueIdParamsSchema = Type.Object({
  leagueId: Type.String({ format: "uuid" }),
});

export const seriesLeagueParamsSchema = Type.Object({
  seriesId: Type.String({ format: "uuid" }),
  leagueId: Type.String({ format: "uuid" }),
});

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});

export const successMessageSchema = Type.Object({
  message: Type.String(),
});

export type CreateSeriesBody = Static<typeof createSeriesSchema>;
export type CreateSeriesFromLeagueBody = Static<
  typeof createSeriesFromLeagueSchema
>;
export type UpdateSeriesBody = Static<typeof updateSeriesSchema>;
