import { Kysely } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { Database } from "../../types/database";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";

export class SeriesService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all series for a location
   */
  async getSeriesByLocation(locationId: string) {
    const seriesList = await this.db
      .selectFrom("series")
      .innerJoin("locations", "locations.id", "series.location_id")
      .select([
        "series.id",
        "series.location_id",
        "locations.name as location_name",
        "series.name",
        "series.description",
        "series.start_date",
        "series.end_date",
        "series.is_active",
        "series.created_at",
      ])
      .where("series.location_id", "=", locationId)
      .orderBy("series.start_date", "desc")
      .execute();

    // Get league counts for each series
    const result = [];
    for (const series of seriesList) {
      const leagueCount = await this.db
        .selectFrom("leagues")
        .select(this.db.fn.countAll<number>().as("count"))
        .where("series_id", "=", series.id)
        .where("status", "!=", "inactive")
        .executeTakeFirst();

      result.push({
        ...series,
        description: series.description ?? null,
        league_count: Number(leagueCount?.count ?? 0),
      });
    }

    return result;
  }

  /**
   * Get a series by ID with its leagues
   */
  async getSeriesById(seriesId: string) {
    const series = await this.db
      .selectFrom("series")
      .innerJoin("locations", "locations.id", "series.location_id")
      .select([
        "series.id",
        "series.location_id",
        "locations.name as location_name",
        "series.name",
        "series.description",
        "series.start_date",
        "series.end_date",
        "series.is_active",
        "series.created_at",
      ])
      .where("series.id", "=", seriesId)
      .executeTakeFirst();

    if (!series) {
      throw new NotFoundError("Series");
    }

    const leagues = await this.db
      .selectFrom("leagues")
      .select(["id", "name", "status", "start_date", "end_date"])
      .where("series_id", "=", seriesId)
      .where("status", "!=", "inactive")
      .orderBy("start_date", "asc")
      .execute();

    return {
      ...series,
      description: series.description ?? null,
      league_count: leagues.length,
      leagues,
    };
  }

  /**
   * Create a new series
   */
  async createSeries(data: {
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
      .insertInto("series")
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
   * Create a new series from an existing league (retroactive flow)
   */
  async createSeriesFromLeague(
    leagueId: string,
    data: {
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    // Verify the league exists
    const league = await this.db
      .selectFrom("leagues")
      .select(["id", "location_id", "start_date", "end_date", "series_id"])
      .where("id", "=", leagueId)
      .where("status", "!=", "inactive")
      .executeTakeFirst();

    if (!league) {
      throw new NotFoundError("League");
    }

    if (league.series_id) {
      throw new ValidationError("League is already part of a series");
    }

    const seriesId = uuidv4();
    const startDate = data.startDate
      ? new Date(data.startDate)
      : league.start_date;
    const endDate = data.endDate ? new Date(data.endDate) : league.end_date;

    // Create series and link league in a transaction
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto("series")
        .values({
          id: seriesId,
          location_id: league.location_id,
          name: data.name,
          description: data.description ?? null,
          start_date: startDate,
          end_date: endDate,
        })
        .execute();

      await trx
        .updateTable("leagues")
        .set({ series_id: seriesId })
        .where("id", "=", leagueId)
        .execute();
    });

    return { id: seriesId, location_id: league.location_id };
  }

  /**
   * Update a series
   */
  async updateSeries(
    seriesId: string,
    data: {
      name?: string;
      description?: string | null;
      start_date?: string;
      end_date?: string;
      is_active?: boolean;
    },
  ) {
    const series = await this.db
      .selectFrom("series")
      .select("id")
      .where("id", "=", seriesId)
      .executeTakeFirst();

    if (!series) {
      throw new NotFoundError("Series");
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
      .updateTable("series")
      .set(updateData)
      .where("id", "=", seriesId)
      .execute();

    return true;
  }

  /**
   * Delete a series (unlinks leagues, doesn't delete them)
   */
  async deleteSeries(seriesId: string) {
    // Unlink leagues from this series
    await this.db
      .updateTable("leagues")
      .set({ series_id: null })
      .where("series_id", "=", seriesId)
      .execute();

    const result = await this.db
      .deleteFrom("series")
      .where("id", "=", seriesId)
      .executeTakeFirst();

    if (!result || result.numDeletedRows === BigInt(0)) {
      throw new NotFoundError("Series");
    }

    return true;
  }

  /**
   * Assign a league to a series, and notify members from prior leagues
   */
  async assignLeagueToSeries(leagueId: string, seriesId: string) {
    // Verify series exists
    const series = await this.db
      .selectFrom("series")
      .select(["id", "location_id", "name"])
      .where("id", "=", seriesId)
      .executeTakeFirst();

    if (!series) {
      throw new NotFoundError("Series");
    }

    // Verify league exists and belongs to the same location
    const league = await this.db
      .selectFrom("leagues")
      .select(["id", "location_id", "name", "status"])
      .where("id", "=", leagueId)
      .executeTakeFirst();

    if (!league) {
      throw new NotFoundError("League");
    }

    if (league.location_id !== series.location_id) {
      throw new ValidationError(
        "League and series must belong to the same location",
      );
    }

    await this.db
      .updateTable("leagues")
      .set({ series_id: seriesId })
      .where("id", "=", leagueId)
      .execute();

    // Notify members from prior completed leagues if this is a pending (upcoming) league
    if (league.status === "pending") {
      await this.notifySeriesMembers(
        seriesId,
        leagueId,
        series.name,
        league.name,
      );
    }

    return true;
  }

  /**
   * Remove a league from a series
   */
  async removeLeagueFromSeries(leagueId: string) {
    await this.db
      .updateTable("leagues")
      .set({ series_id: null })
      .where("id", "=", leagueId)
      .execute();

    return true;
  }

  /**
   * Get the location_id for a series (for auth checks)
   */
  async getSeriesLocationId(seriesId: string): Promise<string | null> {
    const series = await this.db
      .selectFrom("series")
      .select("location_id")
      .where("id", "=", seriesId)
      .executeTakeFirst();

    return series?.location_id ?? null;
  }

  /**
   * Notify members from completed leagues in a series about a new upcoming league
   */
  private async notifySeriesMembers(
    seriesId: string,
    newLeagueId: string,
    seriesName: string,
    leagueName: string,
  ) {
    // Find all completed leagues in this series (excluding the new one)
    const completedLeagues = await this.db
      .selectFrom("leagues")
      .select("id")
      .where("series_id", "=", seriesId)
      .where("id", "!=", newLeagueId)
      .where("status", "=", "completed")
      .execute();

    if (completedLeagues.length === 0) return;

    const completedLeagueIds = completedLeagues.map((l) => l.id);

    // Get unique members from those leagues
    const members = await this.db
      .selectFrom("league_members")
      .select("user_id")
      .where("league_id", "in", completedLeagueIds)
      .execute();

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(members.map((m) => m.user_id))];

    if (uniqueUserIds.length === 0) return;

    // Create notifications for each member
    const notifications = uniqueUserIds.map((userId) => ({
      id: uuidv4(),
      user_id: userId,
      title: `New league in ${seriesName}`,
      body: `A new league "${leagueName}" has been added to the "${seriesName}" series. Join now!`,
      type: "series_new_league" as const,
      action_id: newLeagueId,
      is_read: false,
    }));

    if (notifications.length > 0) {
      await this.db.insertInto("notifications").values(notifications).execute();
    }
  }
}
