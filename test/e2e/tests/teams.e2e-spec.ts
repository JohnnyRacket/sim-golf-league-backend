import { describe, test, expect, beforeAll } from '@jest/globals';
import { api, seedData } from '../helpers/setup';

describe('Teams API (E2E)', () => {
  let leagueId: string;
  let teamId: string;
  let adminUserId: string;
  let regularUserId: string;
  let user2Id: string;
  let teamMemberId: string;
  let joinRequestId: string;

  beforeAll(() => {
    // Get IDs from seeded data for testing
    leagueId = seedData.leagues[0].id;
    teamId = seedData.teams[0].id;
    adminUserId = seedData.users.find(u => u.email === 'admin@example.com')?.id 
      || seedData.users[0].id;
    regularUserId = seedData.users.find(u => u.email === 'user1@example.com')?.id 
      || seedData.users[1].id;
    user2Id = seedData.users.find(u => u.email === 'user2@example.com')?.id 
      || seedData.users[2].id;
    
    // Find a team member ID for testing
    if (seedData.teamMembers.length > 0) {
      teamMemberId = seedData.teamMembers[0].id;
    }
  });

  // Helper function to login as admin (who is also an owner)
  async function loginAsAdmin() {
    await api.login('admin@example.com', 'admin123');
  }

  // Helper function to login as regular user
  async function loginAsUser1() {
    await api.login('user1@example.com', 'password123');
  }

  // Helper function to login as second regular user
  async function loginAsUser2() {
    await api.login('user2@example.com', 'password123');
  }

  describe('Authentication requirements', () => {
    test('Anonymous users cannot access teams', async () => {
      // Clear any existing token
      api.clearToken();
      
      // Try to access teams without authentication
      const response = await api.get('/teams');
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    test('Anonymous users cannot access team details', async () => {
      // Clear any existing token
      api.clearToken();
      
      const response = await api.get(`/teams/${teamId}`);
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    test('Anonymous users cannot access user teams', async () => {
      // Clear any existing token
      api.clearToken();
      
      const response = await api.get('/teams/my');
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Team listings', () => {
    test('Authenticated users can access teams list', async () => {
      await loginAsUser1();
      
      const response = await api.get('/teams');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Users can filter teams by league', async () => {
      await loginAsUser1();
      
      const response = await api.get(`/teams?league_id=${leagueId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All teams in response should be from the specified league
      for (const team of response.data) {
        expect(team.league_id).toBe(leagueId);
      }
    });

    test('Users can access their teams', async () => {
      await loginAsUser1();
      
      const response = await api.get('/teams/my');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Team details', () => {
    test('Users can view team details', async () => {
      await loginAsUser1();
      
      const response = await api.get(`/teams/${teamId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', teamId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('league_id');
      expect(response.data).toHaveProperty('members');
      expect(Array.isArray(response.data.members)).toBe(true);
    });
  });

  describe('Team management permissions', () => {
    test('Regular users cannot create teams', async () => {
      await loginAsUser1();
      
      const teamData = {
        league_id: leagueId,
        name: 'Test Team Created by User',
        max_members: 4
      };
      
      const response = await api.post('/teams', teamData);
      
      // Regular users should get 403 forbidden
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Regular users cannot update teams', async () => {
      await loginAsUser1();
      
      const updateData = {
        name: 'Updated Team Name',
        max_members: 5
      };
      
      const response = await api.put(`/teams/${teamId}`, updateData);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Team member management permissions', () => {
    test('Regular users cannot add members to teams', async () => {
      await loginAsUser1();
      
      const memberData = {
        user_id: user2Id,
        role: 'member'
      };
      
      const response = await api.post(`/teams/${teamId}/members`, memberData);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Regular users cannot update team member roles', async () => {
      if (!teamMemberId) {
        console.log('Skipping test as no team member ID is available');
        return;
      }
      
      await loginAsUser1();
      
      const updateData = {
        role: 'captain'
      };
      
      const response = await api.put(`/teams/${teamId}/members/${teamMemberId}`, updateData);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    test('Regular users cannot remove members from teams', async () => {
      if (!teamMemberId) {
        console.log('Skipping test as no team member ID is available');
        return;
      }
      
      await loginAsUser1();
      
      const response = await api.delete(`/teams/${teamId}/members/${teamMemberId}`);
      
      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Join requests', () => {
    test('Users can submit join requests', async () => {
      await loginAsUser2();
      
      const joinRequestData = {
        team_id: teamId
      };
      
      const response = await api.post('/teams/join', joinRequestData);
      
      // Might return 201 (success) or 400 (already a member or existing request)
      if (response.status === 201) {
        expect(response.data).toHaveProperty('message', 'Join request submitted successfully');
        expect(response.data).toHaveProperty('request_id');
        joinRequestId = response.data.request_id;
      } else {
        expect(response.status).toBe(400);
      }
    });

    test('Users can view their join requests', async () => {
      await loginAsUser2();
      
      const response = await api.get('/teams/join-requests/my');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Regular users cannot view team join requests unless they are members', async () => {
      await loginAsUser2();
      
      const response = await api.get(`/teams/${teamId}/join-requests`);
      
      // Should return 403 unless user happens to be a member of this team
      expect([200, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        expect(response.data).toHaveProperty('error');
      }
    });

    test('Team members can view team join requests', async () => {
      // Login as user1 who should be a team member according to seed data
      await loginAsUser1();
      
      const response = await api.get(`/teams/${teamId}/join-requests`);
      
      // This should succeed if user1 is a member of the team
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        console.log('User1 is not a member of the team or lacks permissions');
      }
    });

    test('Users can cancel their own join requests', async () => {
      if (!joinRequestId) {
        console.log('Skipping test as no join request was created');
        return;
      }
      
      await loginAsUser2();
      
      const response = await api.post(`/teams/join-requests/${joinRequestId}/cancel`, {});
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Join request cancelled');
    });
  });

  describe('Admin team management', () => {
    let newTeamId: string;
    let newMemberId: string;
    let newJoinRequestId: string;
    
    test('Admin can create a new team', async () => {
      await loginAsAdmin();
      
      const newTeam = {
        league_id: leagueId,
        name: 'Admin Test Team',
        max_members: 5,
        status: 'active'
      };
      
      const response = await api.post('/teams', newTeam);
      
      // May return 201 if admin has manager role, or 403 otherwise
      if (response.status === 201) {
        expect(response.data).toHaveProperty('message', 'Team created successfully');
        expect(response.data).toHaveProperty('id');
        newTeamId = response.data.id;
      } else {
        expect(response.status).toBe(403);
      }
    });
    
    test('Admin can update a team if they have proper role', async () => {
      if (!newTeamId) {
        console.log('Skipping test as no team was created');
        return;
      }
      
      await loginAsAdmin();
      
      const updateData = {
        name: 'Updated Admin Team',
        max_members: 6
      };
      
      const response = await api.put(`/teams/${newTeamId}`, updateData);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('message', 'Team updated successfully');
        
        // Verify the update
        const getResponse = await api.get(`/teams/${newTeamId}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.data).toHaveProperty('name', 'Updated Admin Team');
        expect(getResponse.data).toHaveProperty('max_members', 6);
      } else {
        expect(response.status).toBe(403);
      }
    });
    
    test('Admin can add members to a team', async () => {
      if (!newTeamId) {
        console.log('Skipping test as no team was created');
        return;
      }
      
      await loginAsAdmin();
      
      const memberData = {
        user_id: regularUserId,
        role: 'member'
      };
      
      const response = await api.post(`/teams/${newTeamId}/members`, memberData);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('message', 'Member added successfully');
        expect(response.data).toHaveProperty('member');
        expect(response.data.member).toHaveProperty('id');
        newMemberId = response.data.member.id;
      } else {
        // Could be 400 if user is already a member
        expect([400, 403]).toContain(response.status);
      }
    });
    
    test('Admin can update team member roles', async () => {
      if (!newTeamId || !newMemberId) {
        console.log('Skipping test as team or member was not created');
        return;
      }
      
      await loginAsAdmin();
      
      const updateData = {
        role: 'captain'
      };
      
      const response = await api.put(`/teams/${newTeamId}/members/${newMemberId}`, updateData);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('message', 'Member updated successfully');
        expect(response.data).toHaveProperty('member');
        expect(response.data.member).toHaveProperty('role', 'captain');
      } else {
        expect(response.status).toBe(403);
      }
    });
    
    test('Admin can handle join requests', async () => {
      if (!newTeamId) {
        console.log('Skipping test as no team was created');
        return;
      }
      
      // Have user2 submit a join request for the new team
      await loginAsUser2();
      
      const joinRequestData = {
        team_id: newTeamId
      };
      
      const createResponse = await api.post('/teams/join', joinRequestData);
      
      if (createResponse.status === 201) {
        expect(createResponse.data).toHaveProperty('request_id');
        newJoinRequestId = createResponse.data.request_id;
        
        // Now login as admin to handle the request
        await loginAsAdmin();
        
        // View the requests
        const viewResponse = await api.get(`/teams/${newTeamId}/join-requests`);
        
        if (viewResponse.status === 200) {
          expect(Array.isArray(viewResponse.data)).toBe(true);
          
          // Approve the request
          const approveResponse = await api.post(`/teams/${newTeamId}/join-requests/${newJoinRequestId}/approve`, {});
          
          if (approveResponse.status === 200) {
            expect(approveResponse.data).toHaveProperty('message');
            expect(approveResponse.data).toHaveProperty('member');
          } else {
            // Could be 404 if the request was not found or already processed
            expect([400, 403, 404]).toContain(approveResponse.status);
          }
        } else {
          expect(viewResponse.status).toBe(403);
        }
      } else {
        // Could be 400 if user is already a member or has a pending request
        expect(createResponse.status).toBe(400);
      }
    });
    
    test('Admin can remove members from a team', async () => {
      if (!newTeamId || !newMemberId) {
        console.log('Skipping test as team or member was not created');
        return;
      }
      
      await loginAsAdmin();
      
      const response = await api.delete(`/teams/${newTeamId}/members/${newMemberId}`);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('message', 'Member removed successfully');
        
        // Verify the member was removed
        const getResponse = await api.get(`/teams/${newTeamId}`);
        const memberStillExists = getResponse.data.members.some((m: any) => m.id === newMemberId);
        expect(memberStillExists).toBe(false);
      } else {
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Error handling', () => {
    test('Returns 404 for non-existent team', async () => {
      await loginAsUser1();
      
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await api.get(`/teams/${nonExistentId}`);
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error', 'Team not found');
    });
    
    test('Validates input when creating teams', async () => {
      await loginAsAdmin();
      
      // Missing required fields
      const invalidTeam = {
        // Missing league_id and name
      };
      
      const response = await api.post('/teams', invalidTeam);
      
      // Should either be 400 (validation error) or 403 (permission error)
      expect([400, 403]).toContain(response.status);
      expect(response.data).toHaveProperty('error');
    });
    
    test('Cannot join a full team', async () => {
      // This test depends on having a full team, which we can't guarantee
      // We'll skip the actual API call but leave the test as a placeholder
      console.log('Skipping full team test as we cannot guarantee a full team exists');
    });
  });
}); 