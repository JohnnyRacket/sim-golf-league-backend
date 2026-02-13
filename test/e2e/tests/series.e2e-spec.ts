import { describe, test, expect, beforeAll } from "@jest/globals";
import { api, seedData } from "../helpers/setup";

describe("Series API (E2E)", () => {
  let locationId: string;
  let seriesId: string;
  let leagueId: string;

  beforeAll(() => {
    locationId = seedData.locations[0].id;
    seriesId = seedData.series[0].id;
    leagueId = seedData.leagues[0].id;
  });

  async function loginAsAdmin() {
    const response = await api.post("/auth/login", {
      email: "admin@example.com",
      password: "admin123",
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  async function loginAsUser() {
    const response = await api.post("/auth/login", {
      email: "user1@example.com",
      password: "password123",
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe("Authentication requirements", () => {
    test("Anonymous users cannot access series", async () => {
      api.clearToken();
      const response = await api.get(`/series/location/${locationId}`);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /series/location/:locationId", () => {
    test("Returns series for a location", async () => {
      await loginAsAdmin();
      const response = await api.get(`/series/location/${locationId}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(1);
      expect(response.data[0]).toHaveProperty("name");
      expect(response.data[0]).toHaveProperty("location_id", locationId);
    });

    test("Returns empty array for location with no series", async () => {
      await loginAsAdmin();
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await api.get(`/series/location/${fakeId}`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual([]);
    });
  });

  describe("GET /series/:seriesId", () => {
    test("Returns series detail with leagues", async () => {
      await loginAsAdmin();
      const response = await api.get(`/series/${seriesId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", seriesId);
      expect(response.data).toHaveProperty("name", "Spring 2024 Series");
      expect(response.data).toHaveProperty("leagues");
      expect(Array.isArray(response.data.leagues)).toBe(true);
    });

    test("Returns 404 for non-existent series", async () => {
      await loginAsAdmin();
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await api.get(`/series/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe("POST /series", () => {
    test("Location owner can create a series", async () => {
      await loginAsAdmin();
      const response = await api.post("/series", {
        location_id: locationId,
        name: "Fall 2024 Series",
        description: "The fall series",
        start_date: "2024-07-01",
        end_date: "2024-12-31",
      });
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("message");
    });

    test("Non-owner cannot create a series", async () => {
      await loginAsUser();
      const response = await api.post("/series", {
        location_id: locationId,
        name: "Unauthorized Series",
        start_date: "2024-07-01",
        end_date: "2024-12-31",
      });
      expect(response.status).toBe(403);
    });
  });

  describe("PUT /series/:seriesId", () => {
    test("Location owner can update a series", async () => {
      await loginAsAdmin();
      const response = await api.put(`/series/${seriesId}`, {
        name: "Updated Spring 2024 Series",
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message", "Series updated");

      // Verify the update
      const getResponse = await api.get(`/series/${seriesId}`);
      expect(getResponse.data.name).toBe("Updated Spring 2024 Series");
    });

    test("Non-owner cannot update a series", async () => {
      await loginAsUser();
      const response = await api.put(`/series/${seriesId}`, {
        name: "Hacked Series",
      });
      expect(response.status).toBe(403);
    });
  });

  describe("Series-league assignment", () => {
    test("Owner can assign a league to a series", async () => {
      await loginAsAdmin();
      const response = await api.post(`/series/${seriesId}/leagues`, {
        league_id: leagueId,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty(
        "message",
        "League assigned to series",
      );

      // Verify the league appears in the series detail
      const detailResponse = await api.get(`/series/${seriesId}`);
      expect(detailResponse.status).toBe(200);
      const leagueIds = detailResponse.data.leagues.map((l: any) => l.id);
      expect(leagueIds).toContain(leagueId);
    });

    test("Owner can remove a league from a series", async () => {
      await loginAsAdmin();
      const response = await api.delete(
        `/series/${seriesId}/leagues/${leagueId}`,
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty(
        "message",
        "League removed from series",
      );
    });

    test("Non-owner cannot assign a league to a series", async () => {
      await loginAsUser();
      const response = await api.post(`/series/${seriesId}/leagues`, {
        league_id: leagueId,
      });
      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /series/:seriesId", () => {
    let tempSeriesId: string;

    test("Owner can delete a series", async () => {
      await loginAsAdmin();
      // Create a temp series to delete
      const createResponse = await api.post("/series", {
        location_id: locationId,
        name: "Temp Series To Delete",
        start_date: "2025-01-01",
        end_date: "2025-06-30",
      });
      expect(createResponse.status).toBe(201);

      // Get the series ID from the list
      const listResponse = await api.get(`/series/location/${locationId}`);
      const tempSeries = listResponse.data.find(
        (s: any) => s.name === "Temp Series To Delete",
      );
      expect(tempSeries).toBeDefined();
      tempSeriesId = tempSeries.id;

      const deleteResponse = await api.delete(`/series/${tempSeriesId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data).toHaveProperty("message", "Series deleted");

      // Verify it's gone
      const getResponse = await api.get(`/series/${tempSeriesId}`);
      expect(getResponse.status).toBe(404);
    });

    test("Non-owner cannot delete a series", async () => {
      await loginAsUser();
      const response = await api.delete(`/series/${seriesId}`);
      expect(response.status).toBe(403);
    });
  });
});
