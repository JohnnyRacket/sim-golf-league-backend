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
    
    test('Admin can create a new location with all fields', async () => {
      await loginAsAdmin();
      
      const newLocation = {
        name: 'Test Location with All Fields',
        address: '789 Test Boulevard',
        logo_url: 'https://example.com/logo.png',
        banner_url: 'https://example.com/banner.jpg',
        website_url: 'https://golfclub.example.com',
        phone: '+1 (555) 123-4567'
        // coordinates are now generated server-side from the address
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Location created successfully');
      expect(response.data).toHaveProperty('id');
      
      createdLocationId = response.data.id;
      
      // Verify all fields were saved correctly
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data).toHaveProperty('name', newLocation.name);
      expect(getResponse.data).toHaveProperty('address', newLocation.address);
      expect(getResponse.data).toHaveProperty('logo_url', newLocation.logo_url);
      expect(getResponse.data).toHaveProperty('banner_url', newLocation.banner_url);
      expect(getResponse.data).toHaveProperty('website_url', newLocation.website_url);
      expect(getResponse.data).toHaveProperty('phone', newLocation.phone);
      
      // Coordinates should be generated by the server
      expect(getResponse.data).toHaveProperty('coordinates');
      expect(getResponse.data.coordinates).toHaveProperty('x');
      expect(getResponse.data.coordinates).toHaveProperty('y');
    });
    
    test('Admin can create a new location with minimal fields', async () => {
      await loginAsAdmin();
      
      const newLocation = {
        name: 'Test Location for Management',
        address: '789 Test Boulevard'
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Location created successfully');
      expect(response.data).toHaveProperty('id');
      
      // No need to check ID again if we already have one from previous test
      if (!createdLocationId) {
        createdLocationId = response.data.id;
      }
    });
    
    test('Admin can update a location with new fields', async () => {
      await loginAsAdmin();
      
      const updateData = {
        name: 'Updated Test Location',
        address: '789 Updated Boulevard',
        logo_url: 'https://example.com/updated-logo.png',
        banner_url: 'https://example.com/updated-banner.jpg',
        website_url: 'https://updated.example.com',
        phone: '+1 (555) 987-6543'
        // coordinates will be automatically updated based on the new address
      };
      
      const response = await api.put(`/locations/${createdLocationId}`, updateData);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Location updated successfully');
      
      // Verify the update
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.data).toHaveProperty('name', 'Updated Test Location');
      expect(getResponse.data).toHaveProperty('address', '789 Updated Boulevard');
      expect(getResponse.data).toHaveProperty('logo_url', updateData.logo_url);
      expect(getResponse.data).toHaveProperty('banner_url', updateData.banner_url);
      expect(getResponse.data).toHaveProperty('website_url', updateData.website_url);
      expect(getResponse.data).toHaveProperty('phone', updateData.phone);
      
      // Coordinates should be updated based on the new address
      expect(getResponse.data).toHaveProperty('coordinates');
      expect(getResponse.data.coordinates).toHaveProperty('x');
      expect(getResponse.data.coordinates).toHaveProperty('y');
    });
    
    test('Admin can update only specific fields of a location', async () => {
      await loginAsAdmin();
      
      // Only update logo_url and phone
      const partialUpdate = {
        logo_url: 'https://example.com/new-logo.png',
        phone: '+1 (555) 111-2222'
      };
      
      const response = await api.put(`/locations/${createdLocationId}`, partialUpdate);
      
      expect(response.status).toBe(200);
      
      // Verify only the specified fields were updated
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.data).toHaveProperty('logo_url', partialUpdate.logo_url);
      expect(getResponse.data).toHaveProperty('phone', partialUpdate.phone);
      expect(getResponse.data).toHaveProperty('name', 'Updated Test Location'); // unchanged
      expect(getResponse.data).toHaveProperty('address', '789 Updated Boulevard'); // unchanged
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