import { Static, Type } from "@sinclair/typebox";

export const paginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 25 })),
});

export type PaginationQuery = Static<typeof paginationQuerySchema>;

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function paginatedResponseSchema(itemSchema: any) {
  return Type.Object({
    data: Type.Array(itemSchema),
    pagination: Type.Object({
      page: Type.Integer(),
      limit: Type.Integer(),
      total: Type.Integer(),
      total_pages: Type.Integer(),
    }),
  });
}

export function parsePagination(query: PaginationQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}
