import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Handicaps API (E2E)', () => {
  let leagueId: string;
  let team1Id: string;
  let team2Id: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(() => {
    leagueId = seedData.leagues[0].id;
    team1Id = seedData.teams[0].id;
    team2Id = seedData.teams[1].id;
    user1Id = seedData.users[1].id; // user1
    user2Id = seedData.users[2].id; // user2
  });

  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  async function loginAsUser1() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access handicap endpoints', async () => {
      api.clearToken();
      const response = await api.get(`/handicaps/leagues/${leagueId}`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /handicaps/leagues/:leagueId', () => {
    test('Returns league handicaps (initially empty)', async () => {
      await loginAsAdmin();
      const response = await api.get(`/handicaps/leagues/${leagueId}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('PUT /handicaps/leagues/:leagueId/players/:userId', () => {
    test('User can set their own handicap', async () => {
      await loginAsUser1();
      const response = await api.put(`/handicaps/leagues/${leagueId}/players/${user1Id}`, {
        handicap_index: 15.5,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    test('Manager can set another player handicap', async () => {
      await loginAsAdmin();
      const response = await api.put(`/handicaps/leagues/${leagueId}/players/${user2Id}`, {
        handicap_index: 20.0,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    test('Handicap appears in league handicaps list', async () => {
      await loginAsAdmin();
      const response = await api.get(`/handicaps/leagues/${leagueId}`);
      expect(response.status).toBe(200);
      expect(response.data.length).toBeGreaterThanOrEqual(2);

      const user1Handicap = response.data.find((h: any) => h.user_id === user1Id);
      expect(user1Handicap).toBeDefined();
      expect(Number(user1Handicap.handicap_index)).toBe(15.5);
    });

    test('Invalid handicap index is rejected', async () => {
      await loginAsUser1();
      const response = await api.put(`/handicaps/leagues/${leagueId}/players/${user1Id}`, {
        handicap_index: 100, // Out of range (-10 to 54)
      });
      expect(response.status).toBe(400);
    });

    test('Regular user cannot set another player handicap', async () => {
      await loginAsUser1();
      const response = await api.put(`/handicaps/leagues/${leagueId}/players/${user2Id}`, {
        handicap_index: 25.0,
      });
      expect(response.status).toBe(403);
    });
  });

  describe('GET /handicaps/leagues/:leagueId/players/:userId/history', () => {
    test('Returns handicap history for a player', async () => {
      await loginAsAdmin();
      const response = await api.get(`/handicaps/leagues/${leagueId}/players/${user1Id}/history`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(1);
      expect(response.data[0]).toHaveProperty('handicap_index');
      expect(response.data[0]).toHaveProperty('effective_date');
    });

    test('Returns empty array for player with no handicap history', async () => {
      await loginAsAdmin();
      const adminId = seedData.users[0].id;
      const response = await api.get(`/handicaps/leagues/${leagueId}/players/${adminId}/history`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual([]);
    });
  });

  describe('GET /handicaps/teams/:teamId', () => {
    test('Returns team handicap info', async () => {
      await loginAsAdmin();
      const response = await api.get(`/handicaps/teams/${team1Id}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('team_id', team1Id);
      expect(response.data).toHaveProperty('team_name');
      expect(response.data).toHaveProperty('handicap_mode');
    });

    test('Returns 404 for non-existent team', async () => {
      await loginAsAdmin();
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await api.get(`/handicaps/teams/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /handicaps/teams/:teamId', () => {
    test('Manager can set team handicap manually', async () => {
      await loginAsAdmin();
      const response = await api.put(`/handicaps/teams/${team1Id}`, {
        team_handicap: 18.0,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Team handicap updated');

      // Verify
      const getResponse = await api.get(`/handicaps/teams/${team1Id}`);
      expect(Number(getResponse.data.team_handicap)).toBe(18.0);
    });

    test('Non-manager cannot set team handicap', async () => {
      await loginAsUser1();
      const response = await api.put(`/handicaps/teams/${team1Id}`, {
        team_handicap: 25.0,
      });
      expect(response.status).toBe(403);
    });
  });
});
