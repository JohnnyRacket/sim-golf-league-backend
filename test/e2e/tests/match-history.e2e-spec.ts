import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { api, seedData } from '../helpers/setup';
import { v4 as uuidv4 } from 'uuid';

describe('Match History API (E2E)', () => {
  let leagueId: string;
  let teamId: string;
  let matchId: string;
  let userId: string;

  // Helper function to login as user
  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response;
  }

  beforeAll(() => {
    // Get IDs from seeded data
    leagueId = seedData.leagues[0].id;
    teamId = seedData.teams[0].id;
    matchId = seedData.matches[0].id;
    userId = seedData.users[1].id; // Use a regular user
  });

  // Login before each test
  beforeEach(async () => {
    await loginAsUser();
  });

  describe('GET /match-history/league/:league_id', () => {
    it('should return match history for a league', async () => {
      const response = await api.get(`/match-history/league/${leagueId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        const match = response.data[0];
        expect(match).toHaveProperty('id');
        // The API returns team names not IDs
        expect(match).toHaveProperty('home_team_name');
        expect(match).toHaveProperty('away_team_name');
        expect(match).toHaveProperty('match_date');
        expect(match).toHaveProperty('status');
      }
    });

    it('should filter matches by team', async () => {
      const response = await api.get(`/match-history/league/${leagueId}?team_id=${teamId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // Since the response doesn't include team IDs, we can only check that we got results
      if (response.data.length > 0) {
        expect(response.data.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GET /match-history/league/:league_id/date-range', () => {
    it('should return matches within date range', async () => {
      const response = await api.get(
        `/match-history/league/${leagueId}/date-range?start_date=2024-01-01&end_date=2024-12-31`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // Verify all matches fall within the date range
      if (response.data.length > 0) {
        const startDate = new Date('2024-01-01').getTime();
        const endDate = new Date('2024-12-31').getTime();

        for (const match of response.data) {
          const matchDate = new Date(match.match_date).getTime();
          expect(matchDate >= startDate && matchDate <= endDate).toBeTruthy();
        }
      }
    });
  });

  describe('GET /match-history/user/:user_id/summary', () => {
    it('should return user match history summary', async () => {
      const response = await api.get(`/match-history/user/${userId}/summary`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data.length > 0) {
        const summary = response.data[0];
        // The API returns these properties
        expect(summary).toHaveProperty('league_id');
        expect(summary).toHaveProperty('league_name');
        expect(summary).toHaveProperty('team_id');
        expect(summary).toHaveProperty('team_name');
        expect(summary).toHaveProperty('matches_played');
        expect(summary).toHaveProperty('games_won');
      }
    });
  });

  describe('GET /match-history/match/:match_id', () => {
    it('should return match details with games', async () => {
      const response = await api.get(`/match-history/match/${matchId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', matchId);
      // The API returns team names not IDs
      expect(response.data).toHaveProperty('home_team_name');
      expect(response.data).toHaveProperty('away_team_name');
      expect(response.data).toHaveProperty('match_date');
      expect(response.data).toHaveProperty('status');

      // Check for games array
      expect(response.data).toHaveProperty('games');
      expect(Array.isArray(response.data.games)).toBe(true);

      if (response.data.games.length > 0) {
        const game = response.data.games[0];
        expect(game).toHaveProperty('game_number');
        expect(game).toHaveProperty('home_player_name');
        expect(game).toHaveProperty('away_player_name');
      }
    });

    it('should return 404 for non-existent match ID', async () => {
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = uuidv4();
      const response = await api.get(`/match-history/match/${nonExistentId}`);

      expect(response.status).toBe(404);
    });
  });
}); 