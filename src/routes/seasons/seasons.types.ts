import { Static, Type } from "@sinclair/typebox";

export const createSeasonSchema = Type.Object({
  location_id: Type.String({ format: "uuid" }),
  name: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  start_date: Type.String({ format: "date" }),
  end_date: Type.String({ format: "date" }),
});

export const updateSeasonSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  start_date: Type.Optional(Type.String({ format: "date" })),
  end_date: Type.Optional(Type.String({ format: "date" })),
  is_active: Type.Optional(Type.Boolean()),
});

export const seasonSchema = Type.Object({
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

export const seasonDetailSchema = Type.Intersect([
  seasonSchema,
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

export const seasonIdParamsSchema = Type.Object({
  seasonId: Type.String({ format: "uuid" }),
});

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});

export const successMessageSchema = Type.Object({
  message: Type.String(),
});

export type CreateSeasonBody = Static<typeof createSeasonSchema>;
export type UpdateSeasonBody = Static<typeof updateSeasonSchema>;
