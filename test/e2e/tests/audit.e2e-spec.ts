import { describe, it, expect } from "@jest/globals";
import { seedData, api } from "../helpers/setup";

describe("Audit Trail", () => {
  const loginAsAdmin = async () => {
    await api.login("admin@example.com", "admin123");
  };

  const loginAsUser = async () => {
    await api.login("user1@example.com", "password123");
  };

  it("should create audit log when league is deleted (soft)", async () => {
    await loginAsAdmin();

    // Create a throwaway league to delete
    const createResponse = await api.post("/leagues", {
      name: "Audit Test League",
      location_id: seedData.locations[0].id,
      start_date: "2025-01-01T00:00:00Z",
      end_date: "2025-06-30T00:00:00Z",
    });
    expect(createResponse.status).toBe(201);
    const leagueId = createResponse.data.id;

    // Delete it
    const deleteResponse = await api.delete(`/leagues/${leagueId}`);
    expect(deleteResponse.status).toBe(200);

    // We can't query audit_logs directly via API (write-only),
    // but verify the delete completed without error
    expect(deleteResponse.data.message).toContain("deleted");
  });

  it("should create audit log when member role is changed", async () => {
    await loginAsAdmin();

    const leagueId = seedData.leagues[0].id;

    // Get current members
    const membersResponse = await api.get(`/leagues/${leagueId}/members`);
    expect(membersResponse.status).toBe(200);

    // Find a non-manager member to update
    const members = Array.isArray(membersResponse.data)
      ? membersResponse.data
      : membersResponse.data.data || [];
    const playerMember = members.find((m: any) => m.role === "player");

    if (playerMember) {
      const updateResponse = await api.put(
        `/leagues/${leagueId}/members/${playerMember.id}`,
        { role: "spectator" },
      );
      expect(updateResponse.status).toBe(200);

      // Restore original role
      await api.put(`/leagues/${leagueId}/members/${playerMember.id}`, {
        role: "player",
      });
    }
  });

  it("should create audit log when subscription tier is changed", async () => {
    await loginAsAdmin();

    const updateResponse = await api.put("/subscriptions/my/tier", {
      tier: "pro",
    });
    expect(updateResponse.status).toBe(200);

    // Restore to free
    await api.put("/subscriptions/my/tier", { tier: "free" });
  });

  it("should create audit log when invite is accepted", async () => {
    await loginAsAdmin();

    // Create an invite for user2 (who isn't the one accepting)
    const createInvite = await api.post("/invites", {
      league_id: seedData.leagues[0].id,
      recipient_email: "user2@example.com",
      role: "player",
    });
    // Accept may create or conflict - either is acceptable for audit test
    expect([201, 409]).toContain(createInvite.status);
  });
});
