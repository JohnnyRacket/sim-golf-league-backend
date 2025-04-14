import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';
import { v4 as uuidv4 } from 'uuid';
import { SeedTeam, SeedUser } from '../helpers/types';

describe('Teams API (E2E)', () => {
  let teamId: string;
  let leagueId: string;
  let userId: string;
  
  // Helper function to login as user
  async function loginAsUser() {
    const response = await api.post('/auth/login', {
      email: 'user1@example.com',
      password: 'password123'
    });
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    api.setToken(response.data.token);
    userId = seedData.users.find((u: SeedUser) => u.email === 'user1@example.com')?.id || '';
  }
  
  // Helper function to login as admin
  async function loginAsAdmin() {
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    api.setToken(response.data.token);
  }

  beforeAll(() => {
    // Get team and league IDs from seeded data for testing
    teamId = seedData.teams.find((t: SeedTeam) => t.name === 'Eagles')?.id || '';
    leagueId = seedData.leagues[0].id;
  });

  describe('GET /teams', () => {
    beforeEach(async () => {
      await loginAsUser();
    });

    it('should return all teams when authenticated', async () => {
      const response = await api.get('/teams');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('league_id');
    });

    it('should filter teams by league ID', async () => {
      const response = await api.get(`/teams?league_id=${leagueId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // All teams should belong to the specified league
      for (const team of response.data) {
        expect(team.league_id).toBe(leagueId);
      }
    });
  });
  
  describe('GET /teams/my', () => {
    beforeEach(async () => {
      await loginAsUser();
    });

    it('should return teams the user is a member of', async () => {
      const response = await api.get('/teams/my');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('league_id');
      expect(response.data[0]).toHaveProperty('league_name');
      expect(response.data[0]).toHaveProperty('member_count');
    });
  });
  
  describe('GET /teams/:id', () => {
    beforeEach(async () => {
      await loginAsUser();
    });

    it('should return a specific team by ID with its members', async () => {
      const response = await api.get(`/teams/${teamId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', teamId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('league_id');
      expect(response.data).toHaveProperty('members');
      expect(Array.isArray(response.data.members)).toBe(true);
      
      if (response.data.members.length > 0) {
        expect(response.data.members[0]).toHaveProperty('user_id');
        expect(response.data.members[0]).toHaveProperty('username');
        expect(response.data.members[0]).toHaveProperty('role');
      }
    });
    
    it('should return 404 for non-existent team ID', async () => {
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = uuidv4();
      const response = await api.get(`/teams/${nonExistentId}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /teams', () => {
    beforeEach(async () => {
      await loginAsAdmin();
    });

    it('should create a new team', async () => {
      const newTeam = {
        league_id: leagueId,
        name: `Test Team ${Date.now()}`,
        max_members: 4
      };
      
      const response = await api.post('/teams', newTeam);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('message', 'Team created successfully');
      
      // Check that the team was created
      const getResponse = await api.get(`/teams/${response.data.id}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.name).toBe(newTeam.name);
    });
    
    it('should reject team creation with invalid data', async () => {
      const invalidTeam = {
        // Missing league_id
        name: 'Invalid Team',
        max_members: 4
      };
      
      const response = await api.post('/teams', invalidTeam);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('PUT /teams/:id', () => {
    beforeEach(async () => {
      await loginAsAdmin();
    });

    it('should update a team when authenticated as admin', async () => {
      // First ensure we have a team to update
      const newTeam = {
        league_id: leagueId,
        name: `Team to Update ${Date.now()}`,
        max_members: 4
      };
      
      const createResponse = await api.post('/teams', newTeam);
      expect(createResponse.status).toBe(201);
      
      const createdTeamId = createResponse.data.id;
      
      // Now update the team
      const updatedTeam = {
        name: 'Updated Team Name',
        max_members: 6
      };
      
      const response = await api.put(`/teams/${createdTeamId}`, updatedTeam);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Team updated successfully');
      
      // Verify the update
      const getResponse = await api.get(`/teams/${createdTeamId}`);
      expect(getResponse.data.name).toBe('Updated Team Name');
      expect(getResponse.data.max_members).toBe(6);
    });
    
    it('should not allow non-manager users to update teams', async () => {
      await loginAsUser();
      
      // Find any team to try to update
      const targetTeamId = seedData.teams[0].id;
      
      const updatedTeam = {
        name: 'Unauthorized Update'
      };
      
      const response = await api.put(`/teams/${targetTeamId}`, updatedTeam);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('POST /teams/:id/members', () => {
    beforeEach(async () => {
      await loginAsAdmin();
    });

    it('should add a member to a team', async () => {
      // First create a team
      const newTeam = {
        league_id: leagueId,
        name: `Team for Members ${Date.now()}`,
        max_members: 4
      };
      
      const createResponse = await api.post('/teams', newTeam);
      expect(createResponse.status).toBe(201);
      
      const createdTeamId = createResponse.data.id;
      
      // Find a user to add
      const otherUser = seedData.users.find((u: SeedUser) => u.email === 'user2@example.com');
      const otherUserId = otherUser?.id || '';
      
      // Add the member
      const memberData = {
        user_id: otherUserId
      };
      
      const response = await api.post(`/teams/${createdTeamId}/members`, memberData);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Team member added successfully');
      
      // Verify the member was added
      const getResponse = await api.get(`/teams/${createdTeamId}`);
      const addedMember = getResponse.data.members.find((m: { user_id: string }) => m.user_id === otherUserId);
      expect(addedMember).toBeTruthy();
      if (addedMember) {
        expect(addedMember.role).toBe('member');
      }
    });
  });
  
  describe('DELETE /teams/:id/members/:member_id', () => {
    let createdTeamId: string;
    let addedMemberId: string;
    
    beforeEach(async () => {
      await loginAsAdmin();
      
      // Setup: Create a team and add a member for testing deletion
      const newTeam = {
        league_id: leagueId,
        name: `Team for Member Removal ${Date.now()}`,
        max_members: 4
      };
      
      const createResponse = await api.post('/teams', newTeam);
      createdTeamId = createResponse.data.id;
      
      // Add a member to the team
      const otherUser = seedData.users.find((u: SeedUser) => u.email === 'user2@example.com');
      const otherUserId = otherUser?.id || '';
      
      const memberData = {
        user_id: otherUserId
      };
      
      const addResponse = await api.post(`/teams/${createdTeamId}/members`, memberData);
      addedMemberId = addResponse.data.id;
    });

    it('should remove a member from a team', async () => {
      const response = await api.delete(`/teams/${createdTeamId}/members/${addedMemberId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Team member removed successfully');
      
      // Verify the member was removed
      const getResponse = await api.get(`/teams/${createdTeamId}`);
      const memberStillExists = getResponse.data.members.some((m: any) => m.id === addedMemberId);
      expect(memberStillExists).toBe(false);
    });

    it('should not allow non-manager users to remove team members', async () => {
      await loginAsUser();
      
      const response = await api.delete(`/teams/${createdTeamId}/members/${addedMemberId}`);
      
      expect(response.status).toBe(403);
    });
  });
}); 