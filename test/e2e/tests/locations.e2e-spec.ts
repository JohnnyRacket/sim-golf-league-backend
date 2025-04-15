import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Locations API (E2E)', () => {
  let locationId: string;
  let adminId: string;
  let testLocationName = 'Test Location for E2E';

  beforeAll(() => {
    // Get IDs from seeded data for testing
    locationId = seedData.locations[0].id;
    adminId = seedData.users.find(u => u.email === 'admin@example.com')?.id || seedData.users[0].id;
  });

  // Helper function to login as admin (who is also an owner)
  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }
  
  // Helper function to login as regular user
  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe('Authentication requirements', () => {
    test('Authentication is required to view locations list', async () => {
      // Clear any existing token
      api.clearToken();
      
      // Try to access locations without authentication
      const response = await api.get('/locations');
      
      // API requires authentication
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      
      // Verify authenticated access works
      await loginAsUser();
      const authResponse = await api.get('/locations');
      expect(authResponse.status).toBe(200);
      expect(Array.isArray(authResponse.data)).toBe(true);
    });

    test('Authentication is required to view location details', async () => {
      // Clear any existing token
      api.clearToken();
      
      // Try to access a specific location
      const response = await api.get(`/locations/${locationId}`);
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      
      // Verify authenticated access works
      await loginAsUser();
      const authResponse = await api.get(`/locations/${locationId}`);
      expect(authResponse.status).toBe(200);
      expect(authResponse.data).toHaveProperty('id', locationId);
    });
  });

  describe('Authorization checks', () => {
    test('Regular users cannot create locations', async () => {
      await loginAsUser();
      
      const newLocation = {
        name: testLocationName,
        address: '456 Test Street'
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Only admin can create locations', async () => {
      await loginAsAdmin();
      
      const newLocation = {
        name: testLocationName,
        address: '456 Test Street'
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Location created successfully');
      expect(response.data).toHaveProperty('id');
    });

    test('Regular users cannot update locations', async () => {
      await loginAsUser();
      
      const updateData = {
        name: 'Updated Location Name'
      };
      
      const response = await api.put(`/locations/${locationId}`, updateData);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Regular users cannot delete locations', async () => {
      await loginAsUser();
      
      const response = await api.delete(`/locations/${locationId}`);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Location management', () => {
    let createdLocationId: string;
    
    test('Admin can create a new location', async () => {
      await loginAsAdmin();
      
      const newLocation = {
        name: 'Test Location for Management',
        address: '789 Test Boulevard'
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Location created successfully');
      expect(response.data).toHaveProperty('id');
      
      createdLocationId = response.data.id;
    });
    
    test('Admin can update a location', async () => {
      await loginAsAdmin();
      
      const updateData = {
        name: 'Updated Test Location',
        address: '789 Updated Boulevard'
      };
      
      const response = await api.put(`/locations/${createdLocationId}`, updateData);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Location updated successfully');
      
      // Verify the update
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.data).toHaveProperty('name', 'Updated Test Location');
      expect(getResponse.data).toHaveProperty('address', '789 Updated Boulevard');
    });
    
    test('Admin can delete a location with no leagues', async () => {
      await loginAsAdmin();
      
      const response = await api.delete(`/locations/${createdLocationId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Location deleted successfully');
      
      // Verify the deletion
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.status).toBe(404);
    });
    
    test('Admin cannot delete a location with associated leagues', async () => {
      await loginAsAdmin();
      
      // Try to delete the seeded location that has leagues
      const response = await api.delete(`/locations/${locationId}`);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('leagues');
    });
  });

  describe('Error handling', () => {
    test('Returns 404 for non-existent location when authenticated', async () => {
      await loginAsUser();
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await api.get(`/locations/${nonExistentId}`);
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error', 'Location not found');
    });
    
    test('Validates input when creating locations', async () => {
      await loginAsAdmin();
      
      // Missing required fields
      const invalidLocation = {
        // Missing name and address
      };
      
      const response = await api.post('/locations', invalidLocation);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });
}); 