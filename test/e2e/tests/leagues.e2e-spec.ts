import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { seedData } from '../helpers/setup';

describe('Leagues API (E2E)', () => {
  let api: ApiClient;
  let adminApi: ApiClient;

  beforeAll(() => {
    api = new ApiClient();
    adminApi = new ApiClient();
  });

  beforeEach(async () => {
    // Reset tokens before each test
    api.clearToken();
    adminApi.clearToken();
    
    // Login as admin for admin-specific tests
    await adminApi.login('admin@example.com', 'admin123');
  });

  describe('GET /leagues', () => {
    it('should return all leagues when authenticated', async () => {
      // Login as a regular user
      await api.login('user1@example.com', 'password123');
      
      const response = await api.get('/leagues');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Verify league properties
      const league = response.data[0];
      expect(league).toHaveProperty('id');
      expect(league).toHaveProperty('name');
      expect(league).toHaveProperty('location_id');
      expect(league).toHaveProperty('status');
    });
  });

  describe('GET /leagues/:id', () => {
    it('should return a specific league by ID', async () => {
      await api.login('user1@example.com', 'password123');
      
      // Use the seeded league ID
      const leagueId = seedData.leagues[0].id;
      const response = await api.get(`/leagues/${leagueId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', leagueId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('location_id');
    });

    it('should return 404 for non-existent league ID', async () => {
      await api.login('user1@example.com', 'password123');
      
      const response = await api.get('/leagues/nonexistent-id');
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /leagues', () => {
    it('should create a new league when authenticated as admin', async () => {
      const locationId = seedData.locations[0].id;
      
      const newLeague = {
        name: 'Summer 2024 League',
        location_id: locationId,
        start_date: '2024-07-01',
        end_date: '2024-09-30',
        max_teams: 10,
        status: 'pending'
      };
      
      const response = await adminApi.post('/leagues', newLeague);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('name', 'Summer 2024 League');
    });

    it('should reject league creation for non-admin users', async () => {
      await api.login('user1@example.com', 'password123');
      
      const locationId = seedData.locations[0].id;
      
      const newLeague = {
        name: 'Fall 2024 League',
        location_id: locationId,
        start_date: '2024-10-01',
        end_date: '2024-12-31',
        max_teams: 10,
        status: 'pending'
      };
      
      const response = await api.post('/leagues', newLeague);
      
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /leagues/:id', () => {
    it('should update a league when authenticated as admin', async () => {
      const leagueId = seedData.leagues[0].id;
      
      const updatedLeague = {
        name: 'Updated League Name',
        max_teams: 12
      };
      
      const response = await adminApi.put(`/leagues/${leagueId}`, updatedLeague);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', leagueId);
      expect(response.data).toHaveProperty('name', 'Updated League Name');
      expect(response.data).toHaveProperty('max_teams', 12);
    });
  });

  describe('DELETE /leagues/:id', () => {
    it('should not allow league deletion for regular users', async () => {
      await api.login('user1@example.com', 'password123');
      
      const leagueId = seedData.leagues[0].id;
      const response = await api.delete(`/leagues/${leagueId}`);
      
      expect(response.status).toBe(403);
    });
    
    it('should delete a league when authenticated as admin', async () => {
      // We'll test with the newly created league, not our main seeded one
      // Get all leagues
      const leaguesResponse = await adminApi.get('/leagues');
      const newLeagueId = leaguesResponse.data.find(
        (l: any) => l.name === 'Summer 2024 League'
      )?.id;
      
      if (newLeagueId) {
        const response = await adminApi.delete(`/leagues/${newLeagueId}`);
        expect(response.status).toBe(204);
        
        // Verify it's gone
        const checkResponse = await adminApi.get(`/leagues/${newLeagueId}`);
        expect(checkResponse.status).toBe(404);
      } else {
        // Skip if we couldn't find the test league
        console.log('Skipping delete test - test league not found');
      }
    });
  });
}); 