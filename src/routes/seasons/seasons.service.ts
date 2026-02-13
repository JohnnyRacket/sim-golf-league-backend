import { Kysely } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { Database } from "../../types/database";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";

export class SeasonsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all seasons for a location
   */
  async getSeasonsByLocation(locationId: string) {
    const seasons = await this.db
      .selectFrom("seasons")
      .innerJoin("locations", "locations.id", "seasons.location_id")
      .select([
        "seasons.id",
        "seasons.location_id",
        "locations.name as location_name",
        "seasons.name",
        "seasons.description",
        "seasons.start_date",
        "seasons.end_date",
        "seasons.is_active",
        "seasons.created_at",
      ])
      .where("seasons.location_id", "=", locationId)
      .orderBy("seasons.start_date", "desc")
      .execute();

    // Get league counts for each season
    const result = [];
    for (const season of seasons) {
      const leagueCount = await this.db
        .selectFrom("leagues")
        .select(this.db.fn.countAll<number>().as("count"))
        .where("season_id", "=", season.id)
        .where("status", "!=", "inactive")
        .executeTakeFirst();

      result.push({
        ...season,
        description: season.description ?? null,
        league_count: Number(leagueCount?.count ?? 0),
      });
    }

    return result;
  }

  /**
   * Get a season by ID with its leagues
   */
  async getSeasonById(seasonId: string) {
    const season = await this.db
      .selectFrom("seasons")
      .innerJoin("locations", "locations.id", "seasons.location_id")
      .select([
        "seasons.id",
        "seasons.location_id",
        "locations.name as location_name",
        "seasons.name",
        "seasons.description",
        "seasons.start_date",
        "seasons.end_date",
        "seasons.is_active",
        "seasons.created_at",
      ])
      .where("seasons.id", "=", seasonId)
      .executeTakeFirst();

    if (!season) {
      throw new NotFoundError("Season");
    }

    const leagues = await this.db
      .selectFrom("leagues")
      .select(["id", "name", "status", "start_date", "end_date"])
      .where("season_id", "=", seasonId)
      .where("status", "!=", "inactive")
      .orderBy("start_date", "asc")
      .execute();

    return {
      ...season,
      description: season.description ?? null,
      league_count: leagues.length,
      leagues,
    };
  }

  /**
   * Create a new season
   */
  async createSeason(data: {
    locationId: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) {
    const { locationId, name, description, startDate, endDate } = data;

    if (new Date(endDate) <= new Date(startDate)) {
      throw new ValidationError("End date must be after start date");
    }

    const id = uuidv4();
    await this.db
      .insertInto("seasons")
      .values({
        id,
        location_id: locationId,
        name,
        description: description ?? null,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
      })
      .execute();

    return { id };
  }

  /**
   * Update a season
   */
  async updateSeason(
    seasonId: string,
    data: {
      name?: string;
      description?: string | null;
      start_date?: string;
      end_date?: string;
      is_active?: boolean;
    },
  ) {
    const season = await this.db
      .selectFrom("seasons")
      .select("id")
      .where("id", "=", seasonId)
      .executeTakeFirst();

    if (!season) {
      throw new NotFoundError("Season");
    }

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.start_date !== undefined)
      updateData.start_date = new Date(data.start_date);
    if (data.end_date !== undefined)
      updateData.end_date = new Date(data.end_date);
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    if (Object.keys(updateData).length === 0) {
      return true;
    }

    await this.db
      .updateTable("seasons")
      .set(updateData)
      .where("id", "=", seasonId)
      .execute();

    return true;
  }

  /**
   * Delete a season (unlinks leagues, doesn't delete them)
   */
  async deleteSeason(seasonId: string) {
    // Unlink leagues from this season
    await this.db
      .updateTable("leagues")
      .set({ season_id: null })
      .where("season_id", "=", seasonId)
      .execute();

    const result = await this.db
      .deleteFrom("seasons")
      .where("id", "=", seasonId)
      .executeTakeFirst();

    if (!result || result.numDeletedRows === BigInt(0)) {
      throw new NotFoundError("Season");
    }

    return true;
  }

  /**
   * Assign a league to a season
   */
  async assignLeagueToSeason(leagueId: string, seasonId: string) {
    // Verify season exists
    const season = await this.db
      .selectFrom("seasons")
      .select(["id", "location_id"])
      .where("id", "=", seasonId)
      .executeTakeFirst();

    if (!season) {
      throw new NotFoundError("Season");
    }

    // Verify league exists and belongs to the same location
    const league = await this.db
      .selectFrom("leagues")
      .select(["id", "location_id"])
      .where("id", "=", leagueId)
      .executeTakeFirst();

    if (!league) {
      throw new NotFoundError("League");
    }

    if (league.location_id !== season.location_id) {
      throw new ValidationError(
        "League and season must belong to the same location",
      );
    }

    await this.db
      .updateTable("leagues")
      .set({ season_id: seasonId })
      .where("id", "=", leagueId)
      .execute();

    return true;
  }

  /**
   * Remove a league from a season
   */
  async removeLeagueFromSeason(leagueId: string) {
    await this.db
      .updateTable("leagues")
      .set({ season_id: null })
      .where("id", "=", leagueId)
      .execute();

    return true;
  }

  /**
   * Get the location_id for a season (for auth checks)
   */
  async getSeasonLocationId(seasonId: string): Promise<string | null> {
    const season = await this.db
      .selectFrom("seasons")
      .select("location_id")
      .where("id", "=", seasonId)
      .executeTakeFirst();

    return season?.location_id ?? null;
  }
}
