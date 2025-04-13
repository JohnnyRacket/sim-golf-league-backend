import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { seedData } from '../helpers/setup';

describe('Match History API (E2E)', () => {
  let api: ApiClient;

  beforeAll(() => {
    api = new ApiClient();
  });

  beforeEach(async () => {
    // Reset token and login before each test
    api.clearToken();
    await api.login('user1@example.com', 'password123');
  });

  describe('GET /match-history/league/:league_id', () => {
    it('should return match history for a league', async () => {
      const leagueId = seedData.leagues[0].id;
      
      const response = await api.get(`/match-history/league/${leagueId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        const match = response.data[0];
        expect(match).toHaveProperty('id');
        expect(match).toHaveProperty('league_id', leagueId);
        expect(match).toHaveProperty('home_team_id');
        expect(match).toHaveProperty('away_team_id');
        expect(match).toHaveProperty('match_date');
        expect(match).toHaveProperty('status');
      }
    });

    it('should filter matches by team', async () => {
      const leagueId = seedData.leagues[0].id;
      const teamId = seedData.teams[0].id;
      
      const response = await api.get(`/match-history/league/${leagueId}?team_id=${teamId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Check that all returned matches involve the specified team
      response.data.forEach((match: any) => {
        const isTeamInvolved = 
          match.home_team_id === teamId || 
          match.away_team_id === teamId;
        
        expect(isTeamInvolved).toBe(true);
      });
    });
  });

  describe('GET /match-history/league/:league_id/date-range', () => {
    it('should return matches within date range', async () => {
      const leagueId = seedData.leagues[0].id;
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await api.get(
        `/match-history/league/${leagueId}/date-range?start_date=${startDate}&end_date=${endDate}`
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Verify all matches fall within the date range
      response.data.forEach((match: any) => {
        const matchDate = new Date(match.match_date);
        expect(matchDate >= new Date(startDate)).toBe(true);
        expect(matchDate <= new Date(endDate)).toBe(true);
      });
    });
  });

  describe('GET /match-history/user/:user_id/summary', () => {
    it('should return user match history summary', async () => {
      const userId = seedData.users[1].id; // user1
      
      const response = await api.get(`/match-history/user/${userId}/summary`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        const summary = response.data[0];
        expect(summary).toHaveProperty('league_id');
        expect(summary).toHaveProperty('league_name');
        expect(summary).toHaveProperty('matches_played');
        expect(summary).toHaveProperty('games_won');
        expect(summary).toHaveProperty('average_score');
      }
    });
  });

  describe('GET /match-history/match/:match_id', () => {
    it('should return match details with games', async () => {
      const matchId = seedData.matches[0].id;
      
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
        expect(game).toHaveProperty('status');
      }
    });

    it('should return 404 for non-existent match ID', async () => {
      const response = await api.get('/match-history/match/nonexistent-id');
      
      expect(response.status).toBe(404);
    });
  });
}); 