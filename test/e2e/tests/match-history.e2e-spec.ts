import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

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
        expect(match).toHaveProperty('league_id');
        expect(match).toHaveProperty('home_team_id');
        expect(match).toHaveProperty('away_team_id');
        expect(match).toHaveProperty('match_date');
        expect(match).toHaveProperty('status');
      }
    });

    it('should filter matches by team', async () => {
      const response = await api.get(`/match-history/league/${leagueId}?team_id=${teamId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // Check that all returned matches involve the specified team
      if (response.data.length > 0) {
        for (const match of response.data) {
          expect(
            match.home_team_id === teamId || match.away_team_id === teamId
          ).toBeTruthy();
        }
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
        expect(summary).toHaveProperty('match_id');
        expect(summary).toHaveProperty('game_id');
        expect(summary).toHaveProperty('league_id');
        expect(summary).toHaveProperty('team_id');
        expect(summary).toHaveProperty('opponent_team_id');
        expect(summary).toHaveProperty('match_date');
      }
    });
  });

  describe('GET /match-history/match/:match_id', () => {
    it('should return match details with games', async () => {
      const response = await api.get(`/match-history/match/${matchId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', matchId);
      expect(response.data).toHaveProperty('league_id');
      expect(response.data).toHaveProperty('home_team_id');
      expect(response.data).toHaveProperty('away_team_id');
      expect(response.data).toHaveProperty('match_date');
      expect(response.data).toHaveProperty('status');

      // Check for games array
      expect(response.data).toHaveProperty('games');
      expect(Array.isArray(response.data.games)).toBe(true);

      if (response.data.games.length > 0) {
        const game = response.data.games[0];
        expect(game).toHaveProperty('id');
        expect(game).toHaveProperty('match_id', matchId);
        expect(game).toHaveProperty('game_number');
        expect(game).toHaveProperty('home_player_id');
        expect(game).toHaveProperty('away_player_id');
      }
    });

    it('should return 404 for non-existent match ID', async () => {
      const response = await api.get('/match-history/match/nonexistent-id');

      expect(response.status).toBe(404);
    });
  });
}); 