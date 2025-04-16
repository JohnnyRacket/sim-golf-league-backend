import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';
import { v4 as uuidv4 } from 'uuid';

describe('Notifications API (E2E)', () => {
  let adminUserId: string;
  let regularUserId: string;
  let user2Id: string;
  let notification1Id: string;
  let notification2Id: string;
  let notification3Id: string;

  beforeAll(() => {
    // Get IDs from seeded data for testing
    adminUserId = seedData.users.find(u => u.email === 'admin@example.com')?.id 
      || seedData.users[0].id;
    regularUserId = seedData.users.find(u => u.email === 'user1@example.com')?.id 
      || seedData.users[1].id;
    user2Id = seedData.users.find(u => u.email === 'user2@example.com')?.id 
      || seedData.users[2].id;
    
    // Find the specific notification IDs
    notification1Id = seedData.notifications.find(n => 
      n.user_id === regularUserId && n.type === 'team_invite')?.id || '';
    notification2Id = seedData.notifications.find(n => 
      n.user_id === regularUserId && n.type === 'match_reminder')?.id || '';
    notification3Id = seedData.notifications.find(n => 
      n.user_id === user2Id && n.type === 'system_message')?.id || '';
  });

  // Helper function to login as regular user (user1)
  async function loginAsUser1() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  // Helper function to login as user2
  async function loginAsUser2() {
    const response = await api.post('/auth/login', {
      email: 'user2@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access notifications', async () => {
      api.clearToken();
      const response = await api.get('/notifications');
      expect(response.status).toBe(401);
    });

    test('Anonymous users cannot access notification by ID', async () => {
      api.clearToken();
      const response = await api.get(`/notifications/${notification1Id}`);
      expect(response.status).toBe(401);
    });

    test('Anonymous users cannot mark notifications as read', async () => {
      api.clearToken();
      const response = await api.patch(`/notifications/${notification1Id}`, { is_read: true });
      expect(response.status).toBe(401);
    });
  });

  describe('Accessing notifications', () => {
    test('User can get their own notifications', async () => {
      await loginAsUser1();
      const response = await api.get('/notifications');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(2); // User1 has two notifications
      
      // Check notification structure
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('title');
      expect(response.data[0]).toHaveProperty('body');
      expect(response.data[0]).toHaveProperty('type');
      expect(response.data[0]).toHaveProperty('is_read');
      expect(response.data[0]).toHaveProperty('created_at');
      expect(response.data[0]).toHaveProperty('updated_at');
      
      // Check filtering by user
      expect(response.data.every(n => n.user_id === undefined || n.user_id === regularUserId)).toBe(true);
    });

    test('User can get their unread notifications count', async () => {
      await loginAsUser1();
      const response = await api.get('/notifications/unread-count');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data.count).toBe(1); // User1 has one unread notification
    });

    test('User can get a specific notification by ID', async () => {
      await loginAsUser1();
      const response = await api.get(`/notifications/${notification1Id}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', notification1Id);
      expect(response.data).toHaveProperty('title', 'Team Invitation');
      expect(response.data).toHaveProperty('body', 'You have been invited to join the Birdies team');
      expect(response.data).toHaveProperty('type', 'team_invite');
    });

    test('User cannot access another user\'s notification', async () => {
      await loginAsUser1();
      const response = await api.get(`/notifications/${notification3Id}`);
      
      expect(response.status).toBe(404); // Will return not found rather than forbidden for security
    });
  });

  describe('Managing notifications', () => {
    test('User can mark their notification as read', async () => {
      await loginAsUser1();
      const response = await api.patch(`/notifications/${notification1Id}`, { is_read: true });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', notification1Id);
      expect(response.data).toHaveProperty('is_read', true);
      
      // Verify unread count decreased
      const countResponse = await api.get('/notifications/unread-count');
      expect(countResponse.data.count).toBe(0);
    });

    test('User can mark all their notifications as read', async () => {
      // First, reset the read status for testing
      await loginAsUser1();
      await api.patch(`/notifications/${notification1Id}`, { is_read: false });
      
      // Then mark all as read
      const response = await api.post('/notifications/mark-all-read', {});
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'All notifications marked as read');
      
      // Verify all are read
      const countResponse = await api.get('/notifications/unread-count');
      expect(countResponse.data.count).toBe(0);
    });

    test('User can delete their notification', async () => {
      await loginAsUser1();
      const response = await api.delete(`/notifications/${notification1Id}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Notification deleted successfully');
      
      // Verify it's gone
      const getResponse = await api.get(`/notifications/${notification1Id}`);
      expect(getResponse.status).toBe(404);
      
      // Verify total count decreased
      const listResponse = await api.get('/notifications');
      expect(listResponse.data.length).toBe(1); // Only one notification left
    });
  });

  describe('Error handling', () => {
    test('Returns 404 for non-existent notification ID', async () => {
      await loginAsUser1();
      const nonExistentId = uuidv4();
      const response = await api.get(`/notifications/${nonExistentId}`);
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error', 'Notification not found');
    });

    test('Validates input when updating notifications', async () => {
      await loginAsUser2();
      const invalidUpdate = {
        is_read: 'not-a-boolean'
      };
      
      const response = await api.patch(`/notifications/${notification3Id}`, invalidUpdate);
      expect(response.status).toBe(400); // Bad request format
    });
  });
}); 