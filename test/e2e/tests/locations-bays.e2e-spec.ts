import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Location Bays API (E2E)', () => {
  let locationId: string;
  let nonExistentId = '00000000-0000-0000-0000-000000000000';
  let createdBayId: string;

  beforeAll(() => {
    // Get IDs from seeded data for testing
    locationId = seedData.locations[0].id;
  });

  // Helper function to login as admin (who is also an owner)
  async function loginAsAdmin() {
    await api.login('admin@example.com', 'admin123');
  }

  // Helper function to login as regular user
  async function loginAsUser() {
    await api.login('user1@example.com', 'password123');
  }

  describe('Authentication requirements', () => {
    test('Authentication is required to view location bays', async () => {
      // Clear any existing token
      api.clearToken();
      
      // Try to access bays without authentication
      const response = await api.get(`/locations/${locationId}/bays`);
      
      // API requires authentication
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      
      // Verify authenticated access works
      await loginAsUser();
      const authResponse = await api.get(`/locations/${locationId}/bays`);
      expect(authResponse.status).toBe(200);
      expect(Array.isArray(authResponse.data)).toBe(true);
    });

    test('Authentication is required to view bay details', async () => {
      // First create a bay to test with
      await loginAsAdmin();
      const createResponse = await api.post(`/locations/${locationId}/bays`, {
        bay_number: 'Test-Bay-1',
        max_people: 4,
        handedness: 'both'
      });
      expect(createResponse.status).toBe(201);
      createdBayId = createResponse.data.id;
      
      // Clear token and try to access without authentication
      api.clearToken();
      const response = await api.get(`/locations/${locationId}/bays/${createdBayId}`);
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      
      // Verify authenticated access works
      await loginAsUser();
      const authResponse = await api.get(`/locations/${locationId}/bays/${createdBayId}`);
      expect(authResponse.status).toBe(200);
      expect(authResponse.data).toHaveProperty('id', createdBayId);
    });
  });

  describe('Authorization checks', () => {
    test('Regular users cannot create bays', async () => {
      await loginAsUser();
      
      const newBay = {
        bay_number: 'Test-Bay-2',
        max_people: 4,
        handedness: 'right'
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, newBay);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Only admin can create bays', async () => {
      await loginAsAdmin();
      
      const newBay = {
        bay_number: 'Test-Bay-3',
        max_people: 6,
        handedness: 'left',
        details: { 
          simulator_model: 'TrackMan 4',
          has_putting_analysis: true
        }
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, newBay);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Bay created successfully');
      expect(response.data).toHaveProperty('id');

      // Save for later tests
      if (!createdBayId) {
        createdBayId = response.data.id;
      }
    });

    test('Regular users cannot update bays', async () => {
      await loginAsUser();
      
      const updateData = {
        max_people: 8
      };
      
      const response = await api.put(`/locations/${locationId}/bays/${createdBayId}`, updateData);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Regular users cannot delete bays', async () => {
      await loginAsUser();
      
      const response = await api.delete(`/locations/${locationId}/bays/${createdBayId}`);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Bay management (CRUD operations)', () => {
    let testBayId: string;
    
    test('Admin can create a new bay with all fields', async () => {
      await loginAsAdmin();
      
      const newBay = {
        bay_number: 'Bay-Deluxe-1',
        max_people: 8,
        handedness: 'both',
        details: {
          simulator_model: 'GCQuad',
          premium_features: ['club_analysis', 'putting_grid', 'premium_balls'],
          room_size: 'large',
          has_refreshments: true
        }
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, newBay);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Bay created successfully');
      expect(response.data).toHaveProperty('id');
      
      testBayId = response.data.id;
      
      // Verify the bay was created with correct data
      const getResponse = await api.get(`/locations/${locationId}/bays/${testBayId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data).toHaveProperty('bay_number', 'Bay-Deluxe-1');
      expect(getResponse.data).toHaveProperty('max_people', 8);
      expect(getResponse.data).toHaveProperty('handedness', 'both');
      expect(getResponse.data).toHaveProperty('details');
      expect(getResponse.data.details).toHaveProperty('simulator_model', 'GCQuad');
    });
    
    test('Admin can create a bay with minimal required fields', async () => {
      await loginAsAdmin();
      
      const minimalBay = {
        bay_number: 'Bay-Minimal-1'
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, minimalBay);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      
      // Verify defaults were applied
      const getResponse = await api.get(`/locations/${locationId}/bays/${response.data.id}`);
      expect(getResponse.data).toHaveProperty('max_people', 4); // default value
      expect(getResponse.data).toHaveProperty('handedness', 'both'); // default value
    });
    
    test('Admin can get a list of all bays for a location', async () => {
      await loginAsAdmin();
      
      const response = await api.get(`/locations/${locationId}/bays`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Verify structure of returned bays
      const firstBay = response.data[0];
      expect(firstBay).toHaveProperty('id');
      expect(firstBay).toHaveProperty('bay_number');
      expect(firstBay).toHaveProperty('location_id');
      expect(firstBay).toHaveProperty('handedness');
    });
    
    test('Admin can get a specific bay by ID', async () => {
      await loginAsAdmin();
      
      const response = await api.get(`/locations/${locationId}/bays/${testBayId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', testBayId);
      expect(response.data).toHaveProperty('bay_number', 'Bay-Deluxe-1');
    });
    
    test('Admin can update a bay', async () => {
      await loginAsAdmin();
      
      const updateData = {
        bay_number: 'Bay-Deluxe-1-Updated',
        max_people: 10,
        handedness: 'left',
        details: {
          simulator_model: 'GCQuad Pro',
          premium_features: ['club_analysis', 'putting_grid', 'premium_balls', 'virtual_courses'],
          room_size: 'extra_large',
          has_refreshments: true,
          has_service_button: true
        }
      };
      
      const response = await api.put(`/locations/${locationId}/bays/${testBayId}`, updateData);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Bay updated successfully');
      
      // Verify the update
      const getResponse = await api.get(`/locations/${locationId}/bays/${testBayId}`);
      expect(getResponse.data).toHaveProperty('bay_number', 'Bay-Deluxe-1-Updated');
      expect(getResponse.data).toHaveProperty('max_people', 10);
      expect(getResponse.data).toHaveProperty('handedness', 'left');
      expect(getResponse.data.details).toHaveProperty('simulator_model', 'GCQuad Pro');
      expect(getResponse.data.details.premium_features).toContain('virtual_courses');
    });
    
    test('Admin can update only specific fields of a bay', async () => {
      await loginAsAdmin();
      
      // Only update handedness
      const partialUpdate = {
        handedness: 'right'
      };
      
      const response = await api.put(`/locations/${locationId}/bays/${testBayId}`, partialUpdate);
      
      expect(response.status).toBe(200);
      
      // Verify only the specified field was updated
      const getResponse = await api.get(`/locations/${locationId}/bays/${testBayId}`);
      expect(getResponse.data).toHaveProperty('handedness', 'right');
      expect(getResponse.data).toHaveProperty('bay_number', 'Bay-Deluxe-1-Updated'); // unchanged
      expect(getResponse.data).toHaveProperty('max_people', 10); // unchanged
    });
    
    test('Admin can delete a bay', async () => {
      await loginAsAdmin();
      
      // Create a temporary bay to delete
      const createResponse = await api.post(`/locations/${locationId}/bays`, {
        bay_number: 'Bay-To-Delete'
      });
      
      const bayToDeleteId = createResponse.data.id;
      
      // Delete the bay
      const response = await api.delete(`/locations/${locationId}/bays/${bayToDeleteId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Bay deleted successfully');
      
      // Verify the deletion
      const getResponse = await api.get(`/locations/${locationId}/bays/${bayToDeleteId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Error handling', () => {
    test('Returns 404 for non-existent location', async () => {
      await loginAsAdmin();
      
      const response = await api.get(`/locations/${nonExistentId}/bays`);
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error', 'Location not found');
    });
    
    test('Returns 404 for non-existent bay', async () => {
      await loginAsAdmin();
      
      const response = await api.get(`/locations/${locationId}/bays/${nonExistentId}`);
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error', 'Bay not found');
    });
    
    test('Validates input when creating bays', async () => {
      await loginAsAdmin();
      
      // Missing required bay_number field
      const invalidBay = {
        max_people: 4
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, invalidBay);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
    
    test('Validates input for max_people when creating bays', async () => {
      await loginAsAdmin();
      
      // Invalid max_people value (must be >= 1)
      const invalidBay = {
        bay_number: 'Invalid-Bay',
        max_people: 0 // Invalid: should be at least 1
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, invalidBay);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
    
    test('Validates handedness enum values', async () => {
      await loginAsAdmin();
      
      // Invalid handedness value
      const invalidBay = {
        bay_number: 'Invalid-Handedness',
        handedness: 'invalid_value' // Not in the enum: left, right, both
      };
      
      const response = await api.post(`/locations/${locationId}/bays`, invalidBay);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });

  // Clean up created bays at the end to keep the database clean
  describe('Cleanup', () => {
    test('Delete test bays', async () => {
      await loginAsAdmin();
      
      if (createdBayId) {
        await api.delete(`/locations/${locationId}/bays/${createdBayId}`);
      }
      
      // You can add more cleanup for other bays created during testing
    });
  });
}); 