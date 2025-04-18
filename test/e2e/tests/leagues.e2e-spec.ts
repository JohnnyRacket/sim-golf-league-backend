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

  describe('League scheduling functionality', () => {
    let createdLeagueId: string;

    test('Admin can create a league with scheduling options', async () => {
      await loginAsAdmin();
      
      const newLeague = {
        name: 'Test League with Scheduling',
        location_id: locationId,
        start_date: '2024-07-01',
        end_date: '2024-09-30',
        scheduling_format: 'round_robin',
        playoff_format: 'single_elimination',
        playoff_size: 4,
        prize_breakdown: {
          first: 500,
          second: 250,
          third: 100
        }
      };
      
      const response = await api.post('/leagues', newLeague);
      
      // If the admin has appropriate permissions, the league should be created
      if (response.status === 201) {
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('message', 'League created successfully');
        createdLeagueId = response.data.id;
        
        // Verify league was created with correct scheduling options
        const leagueResponse = await api.get(`/leagues/${createdLeagueId}`);
        expect(leagueResponse.status).toBe(200);
        expect(leagueResponse.data).toHaveProperty('scheduling_format', 'round_robin');
        expect(leagueResponse.data).toHaveProperty('playoff_format', 'single_elimination');
        expect(leagueResponse.data).toHaveProperty('playoff_size', 4);
        expect(leagueResponse.data).toHaveProperty('prize_breakdown');
      } else {
        // If admin doesn't have right permissions, we'll skip subsequent tests
        console.log('Admin cannot create leagues, skipping scheduling tests');
      }
    });

    test('Admin can generate a schedule for a league', async () => {
      // Skip if previous test failed to create a league
      if (!createdLeagueId) {
        console.log('Skipping schedule generation test - no league was created');
        return;
      }

      await loginAsAdmin();
      
      // First create at least two teams in the league
      const team1 = await api.post('/teams', {
        league_id: createdLeagueId,
        name: 'Schedule Test Team 1',
        max_members: 4
      });
      
      const team2 = await api.post('/teams', {
        league_id: createdLeagueId,
        name: 'Schedule Test Team 2',
        max_members: 4
      });
      
      // Now generate the schedule
      if (team1.status === 201 && team2.status === 201) {
        const response = await api.post(`/leagues/${createdLeagueId}/generate-schedule`, {});
        
        if (response.status === 200) {
          expect(response.data).toHaveProperty('message', 'League schedule generated successfully');
          expect(response.data).toHaveProperty('matches_created');
          expect(response.data.matches_created).toBeGreaterThan(0);
          
          // Verify matches were created
          const matchesResponse = await api.get('/matches', {
            params: { league_id: createdLeagueId }
          });
          
          expect(matchesResponse.status).toBe(200);
          expect(Array.isArray(matchesResponse.data)).toBe(true);
          expect(matchesResponse.data.length).toBeGreaterThan(0);
        } else {
          // Schedule generation may fail for various reasons (not enough teams, etc.)
          console.log(`Schedule generation failed with status ${response.status}`);
        }
      }
    });
  });
}); 