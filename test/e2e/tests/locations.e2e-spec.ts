import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { api, seedData } from '../helpers/setup';
import { v4 as uuidv4 } from 'uuid';

describe('Locations API (E2E)', () => {
  let locationId: string;
  
  // Helper function to login as admin
  async function loginAsAdmin() {
    await api.login('admin@example.com', 'admin123');
  }
  
  // Helper function to login as user
  async function loginAsUser() {
    await api.login('user1@example.com', 'password123');
  }

  beforeAll(() => {
    // Get ID from seeded data for testing
    locationId = seedData.locations[0].id;
  });

  describe('GET /locations', () => {
    beforeEach(async () => {
      await loginAsUser();
    });

    it('should return all locations when authenticated', async () => {
      const response = await api.get('/locations');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('address');
    });
  });
  
  describe('GET /locations/:id', () => {
    beforeEach(async () => {
      await loginAsUser();
    });

    it('should return a specific location by ID', async () => {
      const response = await api.get(`/locations/${locationId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', locationId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('address');
      expect(response.data).toHaveProperty('city');
      expect(response.data).toHaveProperty('state');
      expect(response.data).toHaveProperty('zip');
      expect(response.data).toHaveProperty('country');
    });
    
    it('should return 404 for non-existent location ID', async () => {
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = uuidv4();
      const response = await api.get(`/locations/${nonExistentId}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /locations', () => {
    beforeEach(async () => {
      await loginAsAdmin();
    });

    it('should create a new location when authenticated as admin', async () => {
      const newLocation = {
        name: 'New Golf Club',
        address: '123 Fairway Dr',
        city: 'Golf Town',
        state: 'FL',
        zip: '33333',
        country: 'USA'
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('message', 'Location created successfully');
    });
    
    it('should reject location creation with invalid data', async () => {
      const invalidLocation = {
        // Missing required fields
        address: '123 Fairway Dr',
        city: 'Golf Town'
      };
      
      const response = await api.post('/locations', invalidLocation);
      
      expect(response.status).toBe(400);
    });
    
    it('should reject location creation when authenticated as regular user', async () => {
      await loginAsUser();
      
      const newLocation = {
        name: 'New Golf Club',
        address: '123 Fairway Dr',
        city: 'Golf Town',
        state: 'FL',
        zip: '33333',
        country: 'USA'
      };
      
      const response = await api.post('/locations', newLocation);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('PUT /locations/:id', () => {
    let createdLocationId: string;
    
    beforeEach(async () => {
      await loginAsAdmin();
      
      // Create a location for testing updates
      const newLocation = {
        name: 'Test Update Location',
        address: '456 Bunker Ave',
        city: 'Test City',
        state: 'TX',
        zip: '77777',
        country: 'USA'
      };
      
      const createResponse = await api.post('/locations', newLocation);
      createdLocationId = createResponse.data.id;
    });

    it('should update a location when authenticated as admin', async () => {
      const updatedLocation = {
        name: 'Updated Golf Club',
        address: '789 Green Path',
        city: 'New City'
      };
      
      const response = await api.put(`/locations/${createdLocationId}`, updatedLocation);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Location updated successfully');
      
      // Verify the update
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.data.name).toBe('Updated Golf Club');
      expect(getResponse.data.address).toBe('789 Green Path');
      expect(getResponse.data.city).toBe('New City');
      // Existing fields should remain unchanged
      expect(getResponse.data.state).toBe('TX');
      expect(getResponse.data.zip).toBe('77777');
    });
    
    it('should reject location update when authenticated as regular user', async () => {
      await loginAsUser();
      
      const updatedLocation = {
        name: 'Hacker Update Attempt'
      };
      
      const response = await api.put(`/locations/${createdLocationId}`, updatedLocation);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('DELETE /locations/:id', () => {
    let createdLocationId: string;
    
    beforeEach(async () => {
      await loginAsAdmin();
      
      // Create a location for testing deletion
      const newLocation = {
        name: 'Test Delete Location',
        address: '999 Delete Dr',
        city: 'Delete City',
        state: 'DC',
        zip: '99999',
        country: 'USA'
      };
      
      const createResponse = await api.post('/locations', newLocation);
      createdLocationId = createResponse.data.id;
    });

    it('should delete a location when authenticated as admin', async () => {
      const response = await api.delete(`/locations/${createdLocationId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Location deleted successfully');
      
      // Verify the deletion
      const getResponse = await api.get(`/locations/${createdLocationId}`);
      expect(getResponse.status).toBe(404);
    });
    
    it('should reject location deletion when authenticated as regular user', async () => {
      await loginAsUser();
      
      const response = await api.delete(`/locations/${createdLocationId}`);
      
      expect(response.status).toBe(403);
    });
    
    it('should return 404 when trying to delete non-existent location', async () => {
      await loginAsAdmin();
      
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = uuidv4();
      const response = await api.delete(`/locations/${nonExistentId}`);
      
      expect(response.status).toBe(404);
    });
  });
}); 