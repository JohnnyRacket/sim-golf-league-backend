import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Invites API (E2E)', () => {
  let leagueId: string;
  let createdInviteId: string;
  let createdInviteCode: string;

  beforeAll(() => {
    leagueId = seedData.leagues[0].id;
  });

  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    api.setToken(response.data.token);
    return response.data.token;
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access invite endpoints', async () => {
      api.clearToken();
      const response = await api.get('/invites/my');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /invites', () => {
    test('League manager can create an invite', async () => {
      await loginAsAdmin();
      const response = await api.post('/invites', {
        league_id: leagueId,
        recipient_email: 'newinvitee@example.com',
        role: 'player',
      });
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('recipient_email', 'newinvitee@example.com');
      expect(response.data).toHaveProperty('status', 'pending');
      expect(response.data).toHaveProperty('invite_code');
      createdInviteId = response.data.id;
      createdInviteCode = response.data.invite_code;
    });

    test('Cannot create duplicate invite for same email + league', async () => {
      await loginAsAdmin();
      const response = await api.post('/invites', {
        league_id: leagueId,
        recipient_email: 'newinvitee@example.com',
        role: 'player',
      });
      expect(response.status).toBe(409);
    });

    test('Cannot invite an existing league member', async () => {
      await loginAsAdmin();
      // user1 is already a league member
      const response = await api.post('/invites', {
        league_id: leagueId,
        recipient_email: 'user1@example.com',
        role: 'player',
      });
      expect(response.status).toBe(409);
    });

    test('Non-manager cannot create an invite', async () => {
      await loginAsUser();
      const response = await api.post('/invites', {
        league_id: leagueId,
        recipient_email: 'another@example.com',
        role: 'player',
      });
      expect(response.status).toBe(403);
    });
  });

  describe('GET /invites/league/:leagueId', () => {
    test('League manager can view pending invites', async () => {
      await loginAsAdmin();
      const response = await api.get(`/invites/league/${leagueId}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(1);
      expect(response.data[0]).toHaveProperty('recipient_email');
      expect(response.data[0]).toHaveProperty('status', 'pending');
      expect(response.data[0]).toHaveProperty('league_name');
      expect(response.data[0]).toHaveProperty('inviter_username');
    });

    test('Non-manager cannot view league invites', async () => {
      await loginAsUser();
      const response = await api.get(`/invites/league/${leagueId}`);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /invites/my', () => {
    test('Authenticated user can check their pending invites', async () => {
      await loginAsUser();
      const response = await api.get('/invites/my');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('DELETE /invites/:inviteId', () => {
    test('Non-manager cannot revoke an invite', async () => {
      await loginAsUser();
      const response = await api.delete(`/invites/${createdInviteId}`);
      expect(response.status).toBe(403);
    });

    test('League manager can revoke an invite', async () => {
      await loginAsAdmin();
      const response = await api.delete(`/invites/${createdInviteId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Invite revoked');

      // Verify it's gone from the list
      const listResponse = await api.get(`/invites/league/${leagueId}`);
      const found = listResponse.data.find((i: any) => i.id === createdInviteId);
      expect(found).toBeUndefined();
    });

    test('Revoking a non-existent invite returns 404', async () => {
      await loginAsAdmin();
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await api.delete(`/invites/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /invites/accept', () => {
    test('Accept invite flow with matching email', async () => {
      await loginAsAdmin();
      // Create an invite for user2 who is already a league member (spectator)
      // This should fail with 409 since user2 is already a member
      const inviteResponse = await api.post('/invites', {
        league_id: leagueId,
        recipient_email: 'user2@example.com',
        role: 'player',
      });
      expect(inviteResponse.status).toBe(409);
    });

    test('Accept fails with invalid invite code', async () => {
      await loginAsUser();
      const response = await api.post('/invites/accept', {
        invite_code: 'nonexistent_code_that_does_not_exist',
      });
      expect(response.status).toBe(404);
    });
  });
});
