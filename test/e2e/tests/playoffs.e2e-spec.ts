import { describe, it, expect } from '@jest/globals';
import { seedData, api } from '../helpers/setup';
import { db } from '../../../src/db';
import { v4 as uuidv4 } from 'uuid';

describe('Playoffs', () => {
  const loginAsAdmin = async () => {
    await api.login('admin@example.com', 'admin123');
  };

  const loginAsUser = async () => {
    await api.login('user1@example.com', 'password123');
  };

  it('should require authentication for playoff endpoints', async () => {
    const leagueId = seedData.leagues[0].id;
    const response = await api.post(`/leagues/${leagueId}/generate-playoffs`, {});
    expect(response.status).toBe(401);
  });

  it('should reject playoff generation for leagues without playoff config', async () => {
    await loginAsAdmin();

    const leagueId = seedData.leagues[0].id;
    // The seeded league has playoff_format='none', so this should fail
    const response = await api.post(`/leagues/${leagueId}/generate-playoffs`, {});
    expect(response.status).toBe(400);
  });

  it('should generate playoff bracket for configured league', async () => {
    await loginAsAdmin();

    // Create a league with playoffs configured
    const createLeague = await api.post('/leagues', {
      name: 'Playoff Test League',
      location_id: seedData.locations[0].id,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-06-30T00:00:00Z',
      playoff_format: 'single_elimination',
      playoff_size: 4,
      day_of_week: 'saturday',
    });
    expect(createLeague.status).toBe(201);
    const playoffLeagueId = createLeague.data.id;

    // Create 4 teams
    const teamIds: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const teamRes = await api.post('/teams', {
        name: `Playoff Team ${i}`,
        league_id: playoffLeagueId,
        max_members: 4,
      });
      expect(teamRes.status).toBe(201);
      teamIds.push(teamRes.data.id);
    }

    // Create stats records so standings exist
    for (let i = 0; i < 4; i++) {
      await db.insertInto('stats')
        .values({
          id: uuidv4(),
          team_id: teamIds[i],
          league_id: playoffLeagueId,
          matches_played: 6,
          matches_won: 6 - i * 2,
          matches_lost: i * 2,
          matches_drawn: 0,
        })
        .execute();
    }

    // Generate playoffs
    const generateResponse = await api.post(
      `/leagues/${playoffLeagueId}/generate-playoffs`,
      {}
    );
    expect(generateResponse.status).toBe(200);
    expect(generateResponse.data.matches_created).toBe(2); // 4 teams = 2 matches in round 1

    // Get bracket
    const bracketResponse = await api.get(
      `/leagues/${playoffLeagueId}/playoff-bracket`
    );
    expect(bracketResponse.status).toBe(200);
    expect(bracketResponse.data.format).toBe('single_elimination');
    expect(bracketResponse.data.playoff_size).toBe(4);
    expect(bracketResponse.data.rounds).toHaveLength(1);
    expect(bracketResponse.data.rounds[0].matches).toHaveLength(2);

    // Verify seeding: Seed 1 vs Seed 4, Seed 2 vs Seed 3
    const round1 = bracketResponse.data.rounds[0].matches;
    const match1 = round1.find((m: any) => m.playoff_seed_home === 1);
    expect(match1).toBeDefined();
    expect(match1.playoff_seed_away).toBe(4);

    const match2 = round1.find((m: any) => m.playoff_seed_home === 2);
    expect(match2).toBeDefined();
    expect(match2.playoff_seed_away).toBe(3);
  });

  it('should reject duplicate playoff generation', async () => {
    await loginAsAdmin();

    // Find the playoff league we just created by looking for one with brackets
    const leagues = await api.get('/leagues');
    const playoffLeague = leagues.data.find
      ? leagues.data.find((l: any) => l.name === 'Playoff Test League')
      : (leagues.data.data || []).find((l: any) => l.name === 'Playoff Test League');

    if (playoffLeague) {
      const response = await api.post(
        `/leagues/${playoffLeague.id}/generate-playoffs`,
        {}
      );
      expect(response.status).toBe(409);
    }
  });

  it('should return empty bracket for league without playoffs', async () => {
    await loginAsAdmin();

    const bracketResponse = await api.get(
      `/leagues/${seedData.leagues[0].id}/playoff-bracket`
    );
    expect(bracketResponse.status).toBe(200);
    expect(bracketResponse.data.rounds).toHaveLength(0);
  });

  it('should reject non-manager from generating playoffs', async () => {
    await loginAsUser();

    const leagueId = seedData.leagues[0].id;
    const response = await api.post(`/leagues/${leagueId}/generate-playoffs`, {});
    expect(response.status).toBe(403);
  });
});
