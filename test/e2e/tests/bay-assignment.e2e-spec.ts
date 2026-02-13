import { describe, it, expect } from '@jest/globals';
import { seedData, api } from '../helpers/setup';

describe('Bay Assignment on Matches', () => {
  const loginAsAdmin = async () => {
    await api.login('admin@example.com', 'admin123');
  };

  it('should create a match with a bay_id', async () => {
    await loginAsAdmin();

    const leagueId = seedData.leagues[0].id;
    const bayId = seedData.bays[0].id;

    const response = await api.post('/matches', {
      league_id: leagueId,
      home_team_id: seedData.teams[0].id,
      away_team_id: seedData.teams[1].id,
      match_date: '2025-05-01T14:00:00Z',
      bay_id: bayId,
    });
    expect(response.status).toBe(201);
  });

  it('should create a match without a bay_id', async () => {
    await loginAsAdmin();

    const leagueId = seedData.leagues[0].id;

    const response = await api.post('/matches', {
      league_id: leagueId,
      home_team_id: seedData.teams[0].id,
      away_team_id: seedData.teams[1].id,
      match_date: '2025-05-02T14:00:00Z',
    });
    expect(response.status).toBe(201);
  });

  it('should update a match to assign a bay', async () => {
    await loginAsAdmin();

    const matchId = seedData.matches[0].id;
    const bayId = seedData.bays[1].id;

    const response = await api.put(`/matches/${matchId}`, {
      bay_id: bayId,
    });
    expect(response.status).toBe(200);
  });

  it('should update a match to clear the bay assignment', async () => {
    await loginAsAdmin();

    const matchId = seedData.matches[0].id;

    const response = await api.put(`/matches/${matchId}`, {
      bay_id: null,
    });
    expect(response.status).toBe(200);
  });
});
