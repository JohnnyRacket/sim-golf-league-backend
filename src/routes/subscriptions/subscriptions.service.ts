import { Kysely } from "kysely";
import { Database, SubscriptionTier } from "../../types/database";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { TIER_LIMITS } from "./subscriptions.types";

export class SubscriptionsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get subscription info for an owner
   */
  async getSubscriptionInfo(ownerId: string) {
    const owner = await this.db
      .selectFrom("owners")
      .select([
        "id",
        "name",
        "subscription_tier",
        "subscription_status",
        "subscription_expires_at",
        "max_locations",
        "max_leagues_per_location",
      ])
      .where("id", "=", ownerId)
      .executeTakeFirst();

    if (!owner) {
      throw new NotFoundError("Owner");
    }

    // Count current usage
    const locations = await this.db
      .selectFrom("locations")
      .select(this.db.fn.countAll<number>().as("count"))
      .where("owner_id", "=", ownerId)
      .executeTakeFirst();

    const leagues = await this.db
      .selectFrom("leagues")
      .innerJoin("locations", "locations.id", "leagues.location_id")
      .select(this.db.fn.countAll<number>().as("count"))
      .where("locations.owner_id", "=", ownerId)
      .where("leagues.status", "!=", "inactive")
      .executeTakeFirst();

    return {
      owner_id: owner.id,
      owner_name: owner.name,
      subscription_tier: owner.subscription_tier,
      subscription_status: owner.subscription_status,
      subscription_expires_at:
        owner.subscription_expires_at?.toISOString() ?? null,
      max_locations: owner.max_locations,
      max_leagues_per_location: owner.max_leagues_per_location,
      current_locations: Number(locations?.count ?? 0),
      current_leagues: Number(leagues?.count ?? 0),
    };
  }

  /**
   * Update an owner's subscription tier (placeholder - no payment processing)
   */
  async updateTier(ownerId: string, tier: SubscriptionTier) {
    const owner = await this.db
      .selectFrom("owners")
      .select("id")
      .where("id", "=", ownerId)
      .executeTakeFirst();

    if (!owner) {
      throw new NotFoundError("Owner");
    }

    const limits = TIER_LIMITS[tier];

    await this.db
      .updateTable("owners")
      .set({
        subscription_tier: tier,
        max_locations:
          limits.max_locations === -1 ? 9999 : limits.max_locations,
        max_leagues_per_location:
          limits.max_leagues_per_location === -1
            ? 9999
            : limits.max_leagues_per_location,
      })
      .where("id", "=", ownerId)
      .execute();

    return true;
  }

  /**
   * Check if an owner can create a new location
   */
  async canCreateLocation(ownerId: string): Promise<boolean> {
    const info = await this.getSubscriptionInfo(ownerId);
    return info.current_locations < info.max_locations;
  }

  /**
   * Check if an owner can create a new league at a specific location
   */
  async canCreateLeague(ownerId: string, locationId: string): Promise<boolean> {
    const owner = await this.db
      .selectFrom("owners")
      .select("max_leagues_per_location")
      .where("id", "=", ownerId)
      .executeTakeFirst();

    if (!owner) return false;

    const leagueCount = await this.db
      .selectFrom("leagues")
      .select(this.db.fn.countAll<number>().as("count"))
      .where("location_id", "=", locationId)
      .where("status", "!=", "inactive")
      .executeTakeFirst();

    return Number(leagueCount?.count ?? 0) < owner.max_leagues_per_location;
  }

  /**
   * Get all available tier plans
   */
  getTierPlans() {
    return Object.entries(TIER_LIMITS).map(([tier, limits]) => ({
      tier,
      ...limits,
    }));
  }
}
