import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Matches API', () => {
  let leagueId: string;
  let teamId: string;
  let otherTeamId: string;
  let userId: string;
  let matchId: string;

  // Helper functions for authentication
  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    expect(response.status).toBe(200);
    api.setToken(response.data.token);
  }

  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    expect(response.status).toBe(200);
    api.setToken(response.data.token);
  }

  beforeAll(async () => {
    // Get IDs from seeded data
    leagueId = seedData.leagues[0].id;
    teamId = seedData.teams[0].id;
    otherTeamId = seedData.teams[1].id;
    userId = seedData.users[1].id; // user1@example.com
  });

  test('Create and update match with simulator settings', async () => {
    await loginAsAdmin();
    
    // Create a match with simulator settings
    const matchDate = new Date();
    matchDate.setDate(matchDate.getDate() + 7);
    
    const simulatorSettings = {
      difficulty: 'hard',
      weather: 'sunny',
      course: 'St Andrews',
      windSpeed: 10
    };
    
    const createResponse = await api.post('/matches', {
      league_id: leagueId,
      home_team_id: teamId,
      away_team_id: otherTeamId,
      match_date: matchDate.toISOString(),
      simulator_settings: simulatorSettings
    });
    
    expect(createResponse.status).toBe(201);
    expect(createResponse.data.id).toBeDefined();
    
    matchId = createResponse.data.id;
    
    // Verify the match was created with simulator settings
    const getResponse = await api.get(`/matches/${matchId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.simulator_settings).toEqual(simulatorSettings);
    
    // Update the match with new simulator settings
    const updatedSettings = {
      difficulty: 'expert',
      weather: 'rainy',
      course: 'Pebble Beach',
      windSpeed: 15,
      additionalSetting: 'new value'
    };
    
    const updateResponse = await api.put(`/matches/${matchId}`, {
      simulator_settings: updatedSettings
    });
    
    expect(updateResponse.status).toBe(200);
    
    // Verify the update
    const getUpdatedResponse = await api.get(`/matches/${matchId}`);
    expect(getUpdatedResponse.status).toBe(200);
    expect(getUpdatedResponse.data.simulator_settings).toEqual(updatedSettings);
  });

  test('Query matches with various filters', async () => {
    await loginAsUser();
    
    // Get matches for a league within a date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // 1 month ago
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month in the future
    
    // Test date range filtering
    const dateFilterResponse = await api.get(`/matches?league_id=${leagueId}&from_date=${startDate.toISOString()}&to_date=${endDate.toISOString()}`);
    expect(dateFilterResponse.status).toBe(200);
    expect(Array.isArray(dateFilterResponse.data)).toBe(true);
    
    // Test team filtering
    const teamFilterResponse = await api.get(`/matches?team_id=${teamId}`);
    expect(teamFilterResponse.status).toBe(200);
    expect(Array.isArray(teamFilterResponse.data)).toBe(true);
    
    // Test status filtering
    const statusFilterResponse = await api.get('/matches?status=scheduled');
    expect(statusFilterResponse.status).toBe(200);
    expect(Array.isArray(statusFilterResponse.data)).toBe(true);
    
    // Test user filtering
    const userFilterResponse = await api.get(`/matches?user_id=${userId}`);
    expect(userFilterResponse.status).toBe(200);
    expect(Array.isArray(userFilterResponse.data)).toBe(true);
    
    // Test with include_stats parameter
    const statsResponse = await api.get(`/matches?league_id=${leagueId}&include_stats=true`);
    expect(statsResponse.status).toBe(200);
    expect(Array.isArray(statsResponse.data)).toBe(true);
  });
  
  test('Get upcoming matches for current user', async () => {
    await loginAsUser();
    
    const response = await api.get('/matches/upcoming');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
  
  test('Get match summary for current user', async () => {
    await loginAsUser();
    
    const response = await api.get('/matches/me/summary');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
  
  test('Get match summary for specific user', async () => {
    await loginAsAdmin();
    
    const response = await api.get(`/matches/user/${userId}/summary`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
  
  test('Create match without simulator settings inherits from league', async () => {
    await loginAsAdmin();
    
    // First, ensure the league has simulator settings
    const leagueSettings = {
      difficulty: 'pro',
      weather: 'windy',
      course: 'St Andrews',
      windSpeed: 15,
      enableHandicaps: true
    };
    
    // Update the league with simulator settings
    await api.put(`/leagues/${leagueId}`, {
      simulator_settings: leagueSettings
    });
    
    // Create a match without simulator settings
    const createResponse = await api.post('/matches', {
      league_id: leagueId,
      home_team_id: teamId,
      away_team_id: otherTeamId,
      match_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days in future
    });
    
    expect(createResponse.status).toBe(201);
    const inheritedMatchId = createResponse.data.id;
    
    // Verify the match inherited league's simulator settings
    const getResponse = await api.get(`/matches/${inheritedMatchId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.simulator_settings).toEqual(leagueSettings);
    
    // Create another match with explicit simulator settings
    const explicitSettings = {
      difficulty: 'easy',
      weather: 'sunny',
      course: 'Pebble Beach'
    };
    
    const createWithSettingsResponse = await api.post('/matches', {
      league_id: leagueId,
      home_team_id: teamId,
      away_team_id: otherTeamId,
      match_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days in future
      simulator_settings: explicitSettings
    });
    
    expect(createWithSettingsResponse.status).toBe(201);
    
    // Verify explicit settings were used instead of league defaults
    const getExplicitResponse = await api.get(`/matches/${createWithSettingsResponse.data.id}`);
    expect(getExplicitResponse.status).toBe(200);
    expect(getExplicitResponse.data.simulator_settings).toEqual(explicitSettings);
  });
}); 