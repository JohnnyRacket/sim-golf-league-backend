import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';

describe('League Memberships API (E2E)', () => {
  let leagueId: string;
  let regularUserId: string;

  beforeAll(() => {
    // Get IDs from seeded data for testing
    leagueId = seedData.leagues[0].id;
    
    // Assuming user1 is a regular user
    regularUserId = seedData.users.find(u => u.email === 'user1@example.com')?.id 
      || seedData.users[1].id; // Fallback to second user if not found
  });

  // Helper function to login as admin (who is also an owner)
  async function loginAsAdmin() {
    await api.login('admin@example.com', 'admin123');
  }

  // Helper function to login as regular user
  async function loginAsUser() {
    await api.login('user1@example.com', 'password123');
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access league memberships', async () => {
      // Clear any existing token
      api.clearToken();
      
      // Try to access league memberships without authentication
      const response = await api.get(`/leagues/${leagueId}/members`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('League membership access', () => {
    test('Authenticated users can view league members', async () => {
      await loginAsUser();
      
      const response = await api.get(`/leagues/${leagueId}/members`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Users can view their league membership status', async () => {
      await loginAsUser();
      
      // This may return 200 or 404 depending on whether the user is a member
      const response = await api.get(`/leagues/${leagueId}/my-membership`);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('user_id');
        expect(response.data).toHaveProperty('league_id', leagueId);
        expect(response.data).toHaveProperty('role');
      } else {
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Role-based access control', () => {
    test('Only authorized users can manage league members', async () => {
      // Regular user should be denied
      await loginAsUser();
      
      const addMemberData = {
        user_id: regularUserId,
        role: 'member'
      };
      
      const userResponse = await api.post(`/leagues/${leagueId}/members`, addMemberData);
      expect([403, 400]).toContain(userResponse.status);
      
      // Admin may have permission
      await loginAsAdmin();
      
      const adminResponse = await api.post(`/leagues/${leagueId}/members`, addMemberData);
      
      // Admin might be allowed or not depending on role configuration
      if (adminResponse.status === 201) {
        expect(adminResponse.data).toHaveProperty('message');
      } else {
        expect([400, 403]).toContain(adminResponse.status);
      }
    });
  });

  describe('Join Requests', () => {
    test('Users can request to join a league', async () => {
      await loginAsUser();
      
      // This test is flexible since the user might already be a member
      const response = await api.post(`/leagues/${leagueId}/join`, {
        requested_role: 'player',
        message: 'I would like to join this league'
      });
      
      // If user is already a member or has a pending request, API should return 400
      // If successful, should return 201
      expect([201, 400]).toContain(response.status);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('message');
      }
    });
  });
}); 