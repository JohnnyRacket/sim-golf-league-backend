import { describe, it, expect, beforeEach } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('User Profile API (E2E)', () => {
  // Login before each test
  beforeEach(async () => {
    await api.login('user1@example.com', 'password123');
  });

  describe('GET /users/me', () => {
    it('should return the current user profile', async () => {
      const response = await api.get('/users/me');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('username');
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('role');
      expect(response.data).toHaveProperty('is_manager');
    });

    it('should return 401 when not authenticated', async () => {
      api.clearToken();
      const response = await api.get('/users/me');
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/me/dashboard', () => {
    it('should return the user dashboard data', async () => {
      const response = await api.get('/users/me/dashboard');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('teams');
      expect(Array.isArray(response.data.teams)).toBe(true);
      expect(response.data).toHaveProperty('upcomingMatches');
      expect(Array.isArray(response.data.upcomingMatches)).toBe(true);
      expect(response.data).toHaveProperty('recentMatches');
      expect(Array.isArray(response.data.recentMatches)).toBe(true);
      expect(response.data).toHaveProperty('stats');
      expect(response.data.stats).toHaveProperty('matches_played');
      expect(response.data.stats).toHaveProperty('matches_won');
      expect(response.data.stats).toHaveProperty('average_score');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update the current user profile', async () => {
      const user = seedData.users.find(u => u.email === 'user1@example.com');
      expect(user).toBeDefined();
      const userId = user?.id;
      
      const newUsername = `User${Date.now()}`;
      
      const response = await api.put(`/users/${userId}`, {
        username: newUsername
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'User updated successfully');
      
      // Verify the update
      const getResponse = await api.get('/users/me');
      expect(getResponse.data.username).toBe(newUsername);
    });

    it('should not allow updating another user', async () => {
      const user = seedData.users.find(u => u.email === 'user2@example.com');
      expect(user).toBeDefined();
      const anotherUserId = user?.id;
      
      const response = await api.put(`/users/${anotherUserId}`, {
        username: 'Hacked'
      });
      
      expect(response.status).toBe(403);
    });
  });
}); 