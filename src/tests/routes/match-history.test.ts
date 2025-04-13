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
  id: number;
  match_date: string;
  status: string;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
}

describe('Match History Routes', () => {
  let app: FastifyInstance;
  let token: string;
  let testData: {
    users: { id: number }[];
    league: { id: number };
    teams: { id: number }[];
    matches: { id: number }[];
  };

  beforeAll(async () => {
    app = await createTestServer();
  });

  beforeEach(async () => {
    // Create test data
    const user1 = await createTestUser({ username: 'user1', email: 'user1@test.com' });
    const user2 = await createTestUser({ username: 'user2', email: 'user2@test.com' });
    const user3 = await createTestUser({ username: 'user3', email: 'user3@test.com' });
    const user4 = await createTestUser({ username: 'user4', email: 'user4@test.com' });

    // Login to get token
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'user1@test.com',
        password: 'password123'
      }
    });
    token = JSON.parse(response.payload).token;

    // Create league structure
    const manager = await createTestManager(user1.id);
    const location = await createTestLocation(manager.id);
    const league = await createTestLeague(location.id);

    // Create teams
    const team1 = await createTestTeam(league.id, user1.id);
    const team2 = await createTestTeam(league.id, user2.id);

    // Add team members
    await createTestTeamMember(team1.id, user1.id, { role: 'captain' });
    await createTestTeamMember(team1.id, user3.id);
    await createTestTeamMember(team2.id, user2.id, { role: 'captain' });
    await createTestTeamMember(team2.id, user4.id);

    // Create matches
    const match1 = await createTestMatch(league.id, team1.id, team2.id, {
      status: 'completed',
      match_date: new Date('2024-01-15')
    });

    const match2 = await createTestMatch(league.id, team2.id, team1.id, {
      status: 'completed',
      match_date: new Date('2024-02-15')
    });

    // Create match games
    await createTestMatchGame(match1.id, user1.id, user2.id, {
      game_number: 1,
      home_score: 72,
      away_score: 75,
      status: 'completed'
    });
    await createTestMatchGame(match1.id, user3.id, user4.id, {
      game_number: 2,
      home_score: 68,
      away_score: 71,
      status: 'completed'
    });

    await createTestMatchGame(match2.id, user2.id, user1.id, {
      game_number: 1,
      home_score: 70,
      away_score: 73,
      status: 'completed'
    });
    await createTestMatchGame(match2.id, user4.id, user3.id, {
      game_number: 2,
      home_score: 74,
      away_score: 69,
      status: 'completed'
    });

    testData = {
      users: [user1, user2, user3, user4],
      league,
      teams: [team1, team2],
      matches: [match1, match2]
    };
  });

  describe('GET /match-history/league/:league_id', () => {
    it('should return match history for a league', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/league/${testData.league.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const matches = JSON.parse(response.payload);
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
        url: `/match-history/league/${testData.league.id}?team_id=${testData.teams[0].id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const matches = JSON.parse(response.payload);
      expect(matches).toHaveLength(2);
      matches.forEach((match: Match) => {
        expect(
          match.home_team.id === testData.teams[0].id ||
          match.away_team.id === testData.teams[0].id
        ).toBe(true);
      });
    });
  });

  describe('GET /match-history/league/:league_id/date-range', () => {
    it('should return matches within date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/league/${testData.league.id}/date-range?start_date=2024-01-01&end_date=2024-01-31`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const matches = JSON.parse(response.payload);
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
        url: `/match-history/user/${testData.users[0].id}/summary`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const summary = JSON.parse(response.payload);
      expect(summary).toHaveProperty('total_matches');
      expect(summary).toHaveProperty('wins');
      expect(summary).toHaveProperty('average_score');
      expect(summary.total_matches).toBe(2);
    });
  });

  describe('GET /match-history/match/:match_id', () => {
    it('should return match details with games', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/match-history/match/${testData.matches[0].id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const match = JSON.parse(response.payload);
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