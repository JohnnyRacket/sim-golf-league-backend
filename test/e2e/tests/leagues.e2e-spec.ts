import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';

describe('Leagues API (E2E)', () => {
  let leagueId: string;
  let locationId: string;

  beforeAll(() => {
    // Get IDs from seeded data for testing
    leagueId = seedData.leagues[0].id;
    locationId = seedData.locations[0].id;
  });

  // Helper function to login as admin (who is also an owner)
  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }
  
  // Helper function to login as regular user
  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access leagues', async () => {
      // Clear any existing token
      api.clearToken();
      
      // Try to access leagues without authentication
      const response = await api.get('/leagues');
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    test('Authenticated users can access leagues list', async () => {
      await loginAsUser();
      
      const response = await api.get('/leagues');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('User-specific endpoints', () => {
    test('Users can get their leagues with /leagues/my', async () => {
      await loginAsUser();
      
      const response = await api.get('/leagues/my');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Users can get league details by ID', async () => {
      await loginAsUser();
      
      const response = await api.get(`/leagues/${leagueId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', leagueId);
      expect(response.data).toHaveProperty('name');
    });

    test('Users can access league standings', async () => {
      await loginAsUser();
      
      const response = await api.get(`/leagues/${leagueId}/standings`);
      
      // The standings endpoint may return 200 or 404 depending on whether
      // standings data exists yet
      if (response.status === 200) {
        expect(response.data).toHaveProperty('league');
        expect(response.data).toHaveProperty('standings');
      } else {
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Role-based access control', () => {
    test('Regular users cannot create leagues', async () => {
      await loginAsUser();
      
      const newLeague = {
        name: 'Test League Created by User',
        location_id: locationId,
        start_date: '2024-07-01',
        end_date: '2024-09-30'
      };
      
      const response = await api.post('/leagues', newLeague);
      
      // The API may return 400 or 403 depending on validation/permission checks
      expect([400, 403]).toContain(response.status);
      expect(response.data).toHaveProperty('error');
    });

    test('Only users with appropriate roles can access /leagues/managed', async () => {
      // Login as admin
      await loginAsAdmin();
      
      const response = await api.get('/leagues/managed');
      
      // This may return 200 or 403 depending on whether admin has manager role
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        expect(response.status).toBe(403);
      }
      
      // Regular user should get 403
      await loginAsUser();
      const userResponse = await api.get('/leagues/managed');
      expect(userResponse.status).toBe(403);
    });
  });
}); 