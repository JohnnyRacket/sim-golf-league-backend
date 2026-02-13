import { describe, it, expect } from '@jest/globals';
import { seedData, api, API_URL } from '../helpers/setup';
import axios from 'axios';

describe('League Discovery / Browse (Public)', () => {
  // Use raw axios for unauthenticated requests since the browse endpoints don't need auth
  const publicGet = async (path: string) => {
    return axios.get(`${API_URL}${path}`, { validateStatus: () => true });
  };

  const loginAsAdmin = async () => {
    await api.login('admin@example.com', 'admin123');
  };

  it('should list public leagues without authentication', async () => {
    const response = await publicGet('/browse/leagues');
    expect(response.status).toBe(200);

    const leagues = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    expect(leagues.length).toBeGreaterThanOrEqual(1);

    // Verify the response shape
    const league = leagues.find((l: any) => l.name === 'Spring 2024 League');
    expect(league).toBeDefined();
    expect(league.location_name).toBeDefined();
    expect(league.current_team_count).toBeDefined();
  });

  it('should filter public leagues by status', async () => {
    const response = await publicGet('/browse/leagues?status=active');
    expect(response.status).toBe(200);

    const leagues = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    leagues.forEach((l: any) => {
      expect(l.status).toBe('active');
    });
  });

  it('should filter public leagues by location', async () => {
    const locationId = seedData.locations[0].id;
    const response = await publicGet(`/browse/leagues?location_id=${locationId}`);
    expect(response.status).toBe(200);

    const leagues = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    leagues.forEach((l: any) => {
      expect(l.location_id).toBe(locationId);
    });
  });

  it('should search public leagues by name', async () => {
    const response = await publicGet('/browse/leagues?search=spring');
    expect(response.status).toBe(200);

    const leagues = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    expect(leagues.length).toBeGreaterThanOrEqual(1);
    leagues.forEach((l: any) => {
      expect(l.name.toLowerCase()).toContain('spring');
    });
  });

  it('should return no results for non-matching search', async () => {
    const response = await publicGet('/browse/leagues?search=zzznomatchzzz');
    expect(response.status).toBe(200);

    const leagues = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    expect(leagues).toHaveLength(0);
  });

  it('should paginate public leagues', async () => {
    const response = await publicGet('/browse/leagues?page=1&limit=1');
    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(response.data.pagination).toBeDefined();
    expect(response.data.pagination.page).toBe(1);
    expect(response.data.pagination.limit).toBe(1);
    expect(response.data.data.length).toBeLessThanOrEqual(1);
  });

  it('should get public league detail', async () => {
    const leagueId = seedData.leagues[0].id;
    const response = await publicGet(`/browse/leagues/${leagueId}`);
    expect(response.status).toBe(200);

    expect(response.data.id).toBe(leagueId);
    expect(response.data.name).toBe('Spring 2024 League');
    expect(response.data.teams).toBeDefined();
    expect(Array.isArray(response.data.teams)).toBe(true);
    expect(response.data.standings).toBeDefined();
    expect(response.data.schedule).toBeDefined();
  });

  it('should return 404 for non-existent league', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await publicGet(`/browse/leagues/${fakeId}`);
    expect(response.status).toBe(404);
  });

  it('should list locations publicly', async () => {
    const response = await publicGet('/browse/locations');
    expect(response.status).toBe(200);

    const locations = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    expect(locations.length).toBeGreaterThanOrEqual(1);

    const location = locations.find((l: any) => l.name === 'Test Golf Club');
    expect(location).toBeDefined();
    expect(location.address).toBeDefined();
  });

  it('should not show inactive leagues in browse', async () => {
    await loginAsAdmin();

    // Create a league and immediately soft-delete it
    const createResponse = await api.post('/leagues', {
      name: 'Hidden League',
      location_id: seedData.locations[0].id,
      start_date: '2025-01-01T00:00:00Z',
      end_date: '2025-06-30T00:00:00Z',
    });
    expect(createResponse.status).toBe(201);
    const hiddenLeagueId = createResponse.data.id;

    // Soft delete
    await api.delete(`/leagues/${hiddenLeagueId}`);

    // Browse should not include it
    const browseResponse = await publicGet('/browse/leagues');
    const leagues = Array.isArray(browseResponse.data)
      ? browseResponse.data
      : browseResponse.data.data || [];
    const found = leagues.find((l: any) => l.id === hiddenLeagueId);
    expect(found).toBeUndefined();
  });

  it('should hide leagues marked as not public', async () => {
    await loginAsAdmin();

    // Create a private league
    const createResponse = await api.post('/leagues', {
      name: 'Private League',
      location_id: seedData.locations[0].id,
      start_date: '2025-01-01T00:00:00Z',
      end_date: '2025-06-30T00:00:00Z',
      is_public: false,
    });
    expect(createResponse.status).toBe(201);
    const privateLeagueId = createResponse.data.id;

    // Browse should not include it
    const browseResponse = await publicGet('/browse/leagues');
    const leagues = Array.isArray(browseResponse.data)
      ? browseResponse.data
      : browseResponse.data.data || [];
    const found = leagues.find((l: any) => l.id === privateLeagueId);
    expect(found).toBeUndefined();

    // Detail endpoint should also 404
    const detailResponse = await publicGet(`/browse/leagues/${privateLeagueId}`);
    expect(detailResponse.status).toBe(404);
  });
});
