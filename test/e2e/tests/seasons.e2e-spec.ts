import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Seasons API (E2E)', () => {
  let locationId: string;
  let seasonId: string;
  let leagueId: string;

  beforeAll(() => {
    locationId = seedData.locations[0].id;
    seasonId = seedData.seasons[0].id;
    leagueId = seedData.leagues[0].id;
  });

  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access seasons', async () => {
      api.clearToken();
      const response = await api.get(`/seasons/location/${locationId}`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /seasons/location/:locationId', () => {
    test('Returns seasons for a location', async () => {
      await loginAsAdmin();
      const response = await api.get(`/seasons/location/${locationId}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(1);
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('location_id', locationId);
    });

    test('Returns empty array for location with no seasons', async () => {
      await loginAsAdmin();
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await api.get(`/seasons/location/${fakeId}`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual([]);
    });
  });

  describe('GET /seasons/:seasonId', () => {
    test('Returns season detail with leagues', async () => {
      await loginAsAdmin();
      const response = await api.get(`/seasons/${seasonId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', seasonId);
      expect(response.data).toHaveProperty('name', 'Spring 2024 Season');
      expect(response.data).toHaveProperty('leagues');
      expect(Array.isArray(response.data.leagues)).toBe(true);
    });

    test('Returns 404 for non-existent season', async () => {
      await loginAsAdmin();
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await api.get(`/seasons/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /seasons', () => {
    test('Location owner can create a season', async () => {
      await loginAsAdmin();
      const response = await api.post('/seasons', {
        location_id: locationId,
        name: 'Fall 2024 Season',
        description: 'The fall season',
        start_date: '2024-07-01',
        end_date: '2024-12-31',
      });
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message');
    });

    test('Non-owner cannot create a season', async () => {
      await loginAsUser();
      const response = await api.post('/seasons', {
        location_id: locationId,
        name: 'Unauthorized Season',
        start_date: '2024-07-01',
        end_date: '2024-12-31',
      });
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /seasons/:seasonId', () => {
    test('Location owner can update a season', async () => {
      await loginAsAdmin();
      const response = await api.put(`/seasons/${seasonId}`, {
        name: 'Updated Spring 2024 Season',
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Season updated');

      // Verify the update
      const getResponse = await api.get(`/seasons/${seasonId}`);
      expect(getResponse.data.name).toBe('Updated Spring 2024 Season');
    });

    test('Non-owner cannot update a season', async () => {
      await loginAsUser();
      const response = await api.put(`/seasons/${seasonId}`, {
        name: 'Hacked Season',
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Season-league assignment', () => {
    test('Owner can assign a league to a season', async () => {
      await loginAsAdmin();
      const response = await api.post(`/seasons/${seasonId}/leagues`, {
        league_id: leagueId,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'League assigned to season');

      // Verify the league appears in the season detail
      const detailResponse = await api.get(`/seasons/${seasonId}`);
      expect(detailResponse.status).toBe(200);
      const leagueIds = detailResponse.data.leagues.map((l: any) => l.id);
      expect(leagueIds).toContain(leagueId);
    });

    test('Owner can remove a league from a season', async () => {
      await loginAsAdmin();
      const response = await api.delete(`/seasons/${seasonId}/leagues/${leagueId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'League removed from season');
    });

    test('Non-owner cannot assign a league to a season', async () => {
      await loginAsUser();
      const response = await api.post(`/seasons/${seasonId}/leagues`, {
        league_id: leagueId,
      });
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /seasons/:seasonId', () => {
    let tempSeasonId: string;

    test('Owner can delete a season', async () => {
      await loginAsAdmin();
      // Create a temp season to delete
      const createResponse = await api.post('/seasons', {
        location_id: locationId,
        name: 'Temp Season To Delete',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
      });
      expect(createResponse.status).toBe(201);

      // Get the season ID from the list
      const listResponse = await api.get(`/seasons/location/${locationId}`);
      const tempSeason = listResponse.data.find((s: any) => s.name === 'Temp Season To Delete');
      expect(tempSeason).toBeDefined();
      tempSeasonId = tempSeason.id;

      const deleteResponse = await api.delete(`/seasons/${tempSeasonId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data).toHaveProperty('message', 'Season deleted');

      // Verify it's gone
      const getResponse = await api.get(`/seasons/${tempSeasonId}`);
      expect(getResponse.status).toBe(404);
    });

    test('Non-owner cannot delete a season', async () => {
      await loginAsUser();
      const response = await api.delete(`/seasons/${seasonId}`);
      expect(response.status).toBe(403);
    });
  });
});
