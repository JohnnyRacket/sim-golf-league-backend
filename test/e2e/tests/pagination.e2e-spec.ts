import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Pagination (E2E)', () => {
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

  describe('Backward compatibility', () => {
    test('Leagues list returns array without pagination params', async () => {
      await loginAsAdmin();
      const response = await api.get('/leagues');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Notifications list returns array without pagination params', async () => {
      await loginAsUser();
      const response = await api.get('/notifications');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Communications list returns array without pagination params', async () => {
      await loginAsAdmin();
      const leagueId = seedData.leagues[0].id;
      const response = await api.get('/communications', {
        params: { league_id: leagueId },
      });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Paginated responses', () => {
    test('Leagues returns paginated result with page param', async () => {
      await loginAsAdmin();
      const response = await api.get('/leagues', {
        params: { page: 1, limit: 10 },
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.pagination).toHaveProperty('page', 1);
      expect(response.data.pagination).toHaveProperty('limit', 10);
      expect(response.data.pagination).toHaveProperty('total');
      expect(response.data.pagination).toHaveProperty('total_pages');
    });

    test('Notifications returns paginated result with page param', async () => {
      await loginAsUser();
      const response = await api.get('/notifications', {
        params: { page: 1, limit: 5 },
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
      expect(response.data.pagination.limit).toBe(5);
    });

    test('Pagination respects limit', async () => {
      await loginAsAdmin();
      const response = await api.get('/leagues', {
        params: { page: 1, limit: 1 },
      });
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeLessThanOrEqual(1);
    });

    test('Requesting beyond available pages returns empty data', async () => {
      await loginAsAdmin();
      const response = await api.get('/leagues', {
        params: { page: 999, limit: 10 },
      });
      expect(response.status).toBe(200);
      expect(response.data.data).toEqual([]);
      expect(response.data.pagination.page).toBe(999);
    });
  });
});
