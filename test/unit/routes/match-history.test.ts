import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { createTestServer } from '../server';
import {
  createTestUser,
  createTestManager,
  createTestLocation,
  createTestLeague,
  createTestTeam,
  createTestTeamMember,
  createTestMatch,
  createTestMatchGame
} from '../utils';

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  status: string;
}

let app: FastifyInstance;
const testData = {
  users: [] as any[],
  managers: [] as any[],
  locations: [] as any[],
  leagues: [] as any[],
  teams: [] as any[],
  teamMembers: [] as any[],
  matches: [] as any[],
  matchGames: [] as any[]
};

describe('Match History Routes', () => {
  beforeAll(async () => {
    app = await createTestServer();
  });

  beforeEach(async () => {
    // Clear arrays
    testData.users.length = 0;
    testData.managers.length = 0;
    testData.locations.length = 0;
    testData.leagues.length = 0;
    testData.teams.length = 0;
    testData.teamMembers.length = 0;
    testData.matches.length = 0;
    testData.matchGames.length = 0;

    // Create test data
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const user3 = await createTestUser();
    const user4 = await createTestUser();
    testData.users.push(user1, user2, user3, user4);

    const manager = await createTestManager(user1.id);
    testData.managers.push(manager);

    const location = await createTestLocation(manager.id);
    testData.locations.push(location);

    const league = await createTestLeague(location.id);
    testData.leagues.push(league);

    const team1 = await createTestTeam(league.id);
    const team2 = await createTestTeam(league.id);
    testData.teams.push(team1, team2);

    const member1 = await createTestTeamMember(team1.id, user2.id);
    const member2 = await createTestTeamMember(team1.id, user4.id);
    const member3 = await createTestTeamMember(team2.id, user3.id);
    testData.teamMembers.push(member1, member2, member3);

    const match1 = await createTestMatch(league.id, team1.id, team2.id, {
      match_date: new Date('2024-01-15'),
      status: 'completed'
    });
    const match2 = await createTestMatch(league.id, team2.id, team1.id, {
      match_date: new Date('2024-02-15'),
      status: 'completed'
    });
    testData.matches.push(match1, match2);

    const game1 = await createTestMatchGame(match1.id, member1.id, member3.id);
    const game2 = await createTestMatchGame(match1.id, member2.id, member3.id);
    testData.matchGames.push(game1, game2);
  });

  describe('GET /match-history/league/:league_id', () => {
    it('should return match history for a league', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/league/${testData.leagues[0].id}`
      });

      const matches = JSON.parse(response.payload);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches).toHaveLength(2);
      expect(matches[0]).toHaveProperty('id');
      expect(matches[0]).toHaveProperty('match_date');
      expect(matches[0]).toHaveProperty('home_team');
      expect(matches[0]).toHaveProperty('away_team');
      expect(matches[0]).toHaveProperty('status', 'completed');
    });

    it('should filter matches by team', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/league/${testData.leagues[0].id}?team_id=${testData.teams[0].id}`
      });

      const matches = JSON.parse(response.payload) as Match[];

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches).toHaveLength(2);

      matches.forEach((match: Match) => {
        expect(
          match.home_team_id === testData.teams[0].id ||
          match.away_team_id === testData.teams[0].id
        ).toBe(true);
      });
    });
  });

  describe('GET /match-history/league/:league_id/date-range', () => {
    it('should return matches within date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/league/${testData.leagues[0].id}/date-range?start_date=2024-01-01&end_date=2024-01-31`
      });

      const matches = JSON.parse(response.payload);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches).toHaveLength(1);
      expect(new Date(matches[0].match_date)).toBeInstanceOf(Date);
      expect(new Date(matches[0].match_date) >= new Date('2024-01-01')).toBe(true);
      expect(new Date(matches[0].match_date) <= new Date('2024-01-31')).toBe(true);
    });
  });

  describe('GET /match-history/user/:user_id/summary', () => {
    it('should return user match history summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/user/${testData.users[1].id}/summary`
      });

      const summary = JSON.parse(response.payload);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary[0]).toHaveProperty('league_id');
      expect(summary[0]).toHaveProperty('league_name');
      expect(summary[0]).toHaveProperty('matches_played');
      expect(summary[0]).toHaveProperty('games_won');
      expect(summary[0]).toHaveProperty('average_score');
    });
  });

  describe('GET /match-history/match/:match_id', () => {
    it('should return match details with games', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/match/${testData.matches[0].id}`
      });

      const match = JSON.parse(response.payload);

      expect(response.statusCode).toBe(200);
      expect(match).toHaveProperty('id', testData.matches[0].id);
      expect(match).toHaveProperty('games');
      expect(match.games).toHaveLength(2);
      expect(match.games[0]).toHaveProperty('home_player');
      expect(match.games[0]).toHaveProperty('away_player');
      expect(match.games[0]).toHaveProperty('home_score');
      expect(match.games[0]).toHaveProperty('away_score');
    });
  });
}); 