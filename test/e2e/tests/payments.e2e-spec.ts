import { describe, it, expect } from '@jest/globals';
import { seedData, api } from '../helpers/setup';

describe('Payments (Mock)', () => {
  const loginAsAdmin = async () => {
    await api.login('admin@example.com', 'admin123');
  };

  const loginAsUser = async () => {
    await api.login('user1@example.com', 'password123');
  };

  it('should require authentication for payment endpoints', async () => {
    const response = await api.post('/payments/checkout', { tier: 'pro' });
    expect(response.status).toBe(401);
  });

  it('should create a mock checkout session (owner)', async () => {
    await loginAsAdmin();

    const response = await api.post('/payments/checkout', { tier: 'pro' });
    expect(response.status).toBe(200);
    expect(response.data.id).toBeDefined();
    expect(response.data.url).toBeDefined();
    expect(response.data.id).toContain('mock_session_');
  });

  it('should reject checkout for non-owner', async () => {
    await loginAsUser();

    const response = await api.post('/payments/checkout', { tier: 'pro' });
    expect(response.status).toBe(403);
  });

  it('should handle mock webhook', async () => {
    await loginAsAdmin();

    const ownerId = seedData.owners[0].id;
    const response = await api.post('/payments/webhook', {
      event_type: 'checkout.session.completed',
      owner_id: ownerId,
      tier: 'pro',
    });
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Webhook processed');

    // Verify tier was updated
    const subscriptionResponse = await api.get('/subscriptions/my');
    expect(subscriptionResponse.status).toBe(200);
    expect(subscriptionResponse.data.subscription_tier).toBe('pro');
  });

  it('should return empty payment history', async () => {
    await loginAsAdmin();

    const response = await api.get('/payments/history');
    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);
  });

  it('should cancel subscription and revert to free tier', async () => {
    await loginAsAdmin();

    // First ensure we're on a paid tier
    await api.post('/payments/webhook', {
      event_type: 'checkout.session.completed',
      owner_id: seedData.owners[0].id,
      tier: 'starter',
    });

    // Cancel
    const cancelResponse = await api.post('/payments/cancel', {});
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.data.message).toContain('free tier');

    // Verify tier reverted
    const subscriptionResponse = await api.get('/subscriptions/my');
    expect(subscriptionResponse.status).toBe(200);
    expect(subscriptionResponse.data.subscription_tier).toBe('free');
  });

  it('should reject cancel for non-owner', async () => {
    await loginAsUser();

    const response = await api.post('/payments/cancel', {});
    expect(response.status).toBe(403);
  });

  it('should handle subscription deletion webhook', async () => {
    await loginAsAdmin();

    // Set to pro first
    await api.put('/subscriptions/my/tier', { tier: 'pro' });

    // Simulate subscription deleted webhook
    const response = await api.post('/payments/webhook', {
      event_type: 'customer.subscription.deleted',
      owner_id: seedData.owners[0].id,
    });
    expect(response.status).toBe(200);

    // Verify reverted to free
    const subscriptionResponse = await api.get('/subscriptions/my');
    expect(subscriptionResponse.status).toBe(200);
    expect(subscriptionResponse.data.subscription_tier).toBe('free');
  });
});
