import { Kysely } from "kysely";
import { Database } from "../types/database";
import { ValidationError } from "../utils/errors";

/**
 * Ensures a league is writable (not completed/archived).
 * Throws ValidationError if the league status is 'completed'.
 */
export async function ensureLeagueWritable(
  db: Kysely<Database>,
  leagueId: string,
): Promise<void> {
  const league = await db
    .selectFrom("leagues")
    .select("status")
    .where("id", "=", leagueId)
    .executeTakeFirst();

  if (league && league.status === "completed") {
    throw new ValidationError(
      "League is archived and read-only. No modifications are allowed.",
    );
  }
}

/**
 * Resolves the league ID from a match ID (for guarding match mutations).
 */
export async function getLeagueIdFromMatch(
  db: Kysely<Database>,
  matchId: string,
): Promise<string | null> {
  const match = await db
    .selectFrom("matches")
    .select("league_id")
    .where("id", "=", matchId)
    .executeTakeFirst();

  return match?.league_id ?? null;
}

/**
 * Resolves the league ID from a team ID (for guarding team mutations).
 */
export async function getLeagueIdFromTeam(
  db: Kysely<Database>,
  teamId: string,
): Promise<string | null> {
  const team = await db
    .selectFrom("teams")
    .select("league_id")
    .where("id", "=", teamId)
    .executeTakeFirst();

  return team?.league_id ?? null;
}
