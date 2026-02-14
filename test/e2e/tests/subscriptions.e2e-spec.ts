import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Subscriptions API (E2E)', () => {
  async function loginAsAdmin() {
    await api.login('admin@example.com', 'admin123');
  }

  async function loginAsUser() {
    await api.login('user1@example.com', 'password123');
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access subscription endpoints', async () => {
      api.clearToken();
      const response = await api.get('/subscriptions/plans');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /subscriptions/plans', () => {
    test('Returns available tier plans', async () => {
      await loginAsAdmin();
      const response = await api.get('/subscriptions/plans');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(4); // free, starter, pro, enterprise

      const tiers = response.data.map((p: any) => p.tier);
      expect(tiers).toContain('free');
      expect(tiers).toContain('starter');
      expect(tiers).toContain('pro');
      expect(tiers).toContain('enterprise');

      // Check structure of a plan
      const freePlan = response.data.find((p: any) => p.tier === 'free');
      expect(freePlan).toHaveProperty('max_locations');
      expect(freePlan).toHaveProperty('max_leagues_per_location');
      expect(freePlan).toHaveProperty('features');
      expect(Array.isArray(freePlan.features)).toBe(true);
    });

    test('Regular users can also view plans', async () => {
      await loginAsUser();
      const response = await api.get('/subscriptions/plans');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('GET /subscriptions/my', () => {
    test('Owner can view their subscription info', async () => {
      await loginAsAdmin();
      const response = await api.get('/subscriptions/my');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('owner_id');
      expect(response.data).toHaveProperty('subscription_tier');
      expect(response.data).toHaveProperty('subscription_status');
      expect(response.data).toHaveProperty('max_locations');
      expect(response.data).toHaveProperty('max_leagues_per_location');
      expect(response.data).toHaveProperty('current_locations');
      expect(response.data).toHaveProperty('current_leagues');
    });

    test('Non-owner gets 403 or 404', async () => {
      await loginAsUser();
      const response = await api.get('/subscriptions/my');
      // user1 is not an owner, so they should get 403 (role check) or 404 (no owner profile)
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('PUT /subscriptions/my/tier', () => {
    test('Owner can update their tier', async () => {
      await loginAsAdmin();
      const response = await api.put('/subscriptions/my/tier', {
        tier: 'starter',
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('starter');

      // Verify the tier was updated
      const infoResponse = await api.get('/subscriptions/my');
      expect(infoResponse.status).toBe(200);
      expect(infoResponse.data.subscription_tier).toBe('starter');
    });

    test('Owner can downgrade tier back to free', async () => {
      await loginAsAdmin();
      const response = await api.put('/subscriptions/my/tier', {
        tier: 'free',
      });
      expect(response.status).toBe(200);
    });

    test('Non-owner cannot update tier', async () => {
      await loginAsUser();
      const response = await api.put('/subscriptions/my/tier', {
        tier: 'pro',
      });
      expect([403, 404]).toContain(response.status);
    });

    test('Invalid tier value is rejected', async () => {
      await loginAsAdmin();
      const response = await api.put('/subscriptions/my/tier', {
        tier: 'invalid_tier',
      });
      expect(response.status).toBe(400);
    });
  });
});
