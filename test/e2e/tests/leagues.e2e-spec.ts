import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';
import { v4 as uuidv4 } from 'uuid';

describe('Leagues API (E2E)', () => {
  let leagueId: string;
  
  // Helper function to login as admin
  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    api.setToken(response.data.token);
  }
  
  // Helper function to login as user
  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
  }

  beforeAll(() => {
    // Get a league ID from seeded data for testing
    leagueId = seedData.leagues[0].id;
  });

  describe('GET /leagues', () => {
    it('should return all leagues when authenticated', async () => {
      // Login first
      await loginAsUser();
      
      const response = await api.get('/leagues');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /leagues/:id', () => {
    it('should return a specific league by ID', async () => {
      await loginAsUser();
      
      const response = await api.get(`/leagues/${leagueId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', leagueId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('location_id');
      expect(response.data).toHaveProperty('start_date');
      expect(response.data).toHaveProperty('end_date');
    });
    
    it('should return 404 for non-existent league ID', async () => {
      await loginAsUser();
      
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = uuidv4();
      const response = await api.get(`/leagues/${nonExistentId}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /leagues', () => {
    it('should create a new league when authenticated as admin', async () => {
      await loginAsAdmin();
      
      const newLeague = {
        name: 'Summer 2024 League',
        location_id: seedData.locations[0].id,
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T00:00:00Z',
        max_teams: 6,
        status: 'pending'
      };
      
      const response = await api.post('/leagues', newLeague);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('message', 'League created successfully');
    });
    
    it('should reject league creation for non-admin users', async () => {
      await loginAsUser();
      
      const newLeague = {
        name: 'Invalid League',
        location_id: seedData.locations[0].id,
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-11-30T00:00:00Z',
        max_teams: 4,
        status: 'pending'
      };
      
      const response = await api.post('/leagues', newLeague);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('PUT /leagues/:id', () => {
    it('should update a league when authenticated as admin', async () => {
      await loginAsAdmin();
      
      const updatedLeague = {
        name: 'Updated League Name',
        max_teams: 12,
        status: 'active'
      };
      
      const response = await api.put(`/leagues/${leagueId}`, updatedLeague);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'League updated successfully');
    });
  });
  
  describe('DELETE /leagues/:id', () => {
    it('should not allow league deletion for regular users', async () => {
      await loginAsUser();
      
      const response = await api.delete(`/leagues/${leagueId}`);
      
      expect(response.status).toBe(403);
    });
    
    it('should delete a league when authenticated as admin', async () => {
      await loginAsAdmin();
      
      // First create a new league to delete
      const newLeague = {
        name: 'League to Delete',
        location_id: seedData.locations[0].id,
        start_date: '2024-10-01T00:00:00Z',
        end_date: '2024-12-31T00:00:00Z',
        max_teams: 6,
        status: 'pending'
      };
      
      const createResponse = await api.post('/leagues', newLeague);
      expect(createResponse.status).toBe(201);
      
      const newLeagueId = createResponse.data.id;
      
      // Then delete it
      const deleteResponse = await api.delete(`/leagues/${newLeagueId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data).toHaveProperty('message', 'League deleted successfully');
      
      // Verify it's gone
      const getResponse = await api.get(`/leagues/${newLeagueId}`);
      expect(getResponse.status).toBe(404);
    });
  });
}); 