import { db } from "../../../src/db";
import { seed } from "./seeder";
import { beforeAll, afterEach, afterAll } from "@jest/globals";
import { ApiClient } from "./api-client";
import { SeedData } from "./types";

// Test setup config
export const API_URL = process.env.API_URL || "http://localhost:3001";

// Will be populated during setup
export let seedData: SeedData;
export let api: ApiClient;

beforeAll(async () => {
  console.log("Starting E2E test setup...");
  console.log(`Using API URL: ${API_URL}`);

  // Allow time for the server to be fully ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    // Seed the database
    seedData = await seed();
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }

  // Initialize a clean API client
  api = new ApiClient(API_URL);
});

afterEach(async () => {
  // Reset API client after each test
  api.clearToken();
});

afterAll(async () => {
  console.log("Cleaning up E2E test environment...");

  try {
    // Clean up test data in order respecting foreign key constraints
    await db.deleteFrom("audit_logs").execute();
    await db.deleteFrom("notifications").execute();
    await db.deleteFrom("match_result_submissions").execute();
    await db.deleteFrom("matches").execute();
    await db.deleteFrom("team_members").execute();
    await db.deleteFrom("team_join_requests").execute();
    await db.deleteFrom("stats").execute();
    await db.deleteFrom("teams").execute();
    await db.deleteFrom("league_members").execute();
    await db.deleteFrom("league_membership_requests").execute();
    await db.deleteFrom("league_invites").execute();
    await db.deleteFrom("player_handicaps").execute();
    await db.deleteFrom("communications").execute();
    await db.deleteFrom("leagues").execute();
    await db.deleteFrom("series").execute();
    await db.deleteFrom("bays").execute();
    await db.deleteFrom("locations").execute();
    await db.deleteFrom("owners").execute();
    await db.deleteFrom("password_reset_challenges").execute();
    await db.deleteFrom("users").execute();

    // Close database connection
    await db.destroy();
    console.log("Database cleanup completed");
  } catch (error) {
    console.error("Error cleaning up database:", error);
  }
});
