import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database, TeamMemberRole, TeamStatus } from '../../types/database';
import { TeamBasic, TeamDetail, TeamMember, TeamWithMemberCount, JoinRequest } from './teams.types';
import { NotFoundError, ValidationError, ConflictError, DatabaseError, AuthorizationError } from '../../utils/errors';

export class TeamsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all teams with optional filtering by league
   */
  async getAllTeams(leagueId?: string): Promise<TeamBasic[]> {
    try {
      let query = this.db.selectFrom('teams')
        .selectAll();
      
      if (leagueId) {
        query = query.where('league_id', '=', leagueId);
      }
      
      return await query.execute();
    } catch (error) {
      throw new DatabaseError('Failed to get teams', error);
    }
  }

  /**
   * Get teams the user is a member of
   */
  async getUserTeams(userId: string): Promise<TeamWithMemberCount[]> {
    try {
      const teams = await this.db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .select([
          'teams.id',
          'teams.name',
          'teams.max_members',
          'teams.status',
          'team_members.role',
          'leagues.id as league_id',
          'leagues.name as league_name',
          'locations.name as location_name'
        ])
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .execute();
      
      // For each team, get member count
      const teamsWithMemberCount = await Promise.all(teams.map(async (team) => {
        const memberCount = await this.db.selectFrom('team_members')
          .select(({ fn }) => fn.count<number>('id').as('count'))
          .where('team_id', '=', team.id)
          .where('status', '=', 'active')
          .executeTakeFirst();
          
        return {
          ...team,
          member_count: memberCount?.count || 0
        };
      }));
      
      return teamsWithMemberCount as TeamWithMemberCount[];
    } catch (error) {
      throw new DatabaseError('Failed to get user teams', error);
    }
  }

  /**
   * Get team by ID with members
   */
  async getTeamById(id: string): Promise<TeamDetail | null> {
    try {
      const team = await this.db.selectFrom('teams')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (!team) {
        return null;
      }
      
      // Get team members
      const members = await this.db.selectFrom('team_members')
        .innerJoin('users', 'users.id', 'team_members.user_id')
        .select([
          'team_members.id',
          'team_members.user_id',
          'team_members.role',
          'team_members.status',
          'users.username'
        ])
        .where('team_id', '=', id)
        .orderBy('team_members.role')
        .execute();
      
      return {
        ...team,
        members
      } as TeamDetail;
    } catch (error) {
      throw new DatabaseError('Failed to get team', error);
    }
  }

  /**
   * Checks if a user is authorized to manage a league
   */
  async isLeagueManager(leagueId: string, userId: string): Promise<boolean> {
    try {
      const league = await this.db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .select(['leagues.id', 'owners.user_id'])
        .where('leagues.id', '=', leagueId)
        .executeTakeFirst();
      
      if (!league) {
        return false;
      }
      
      return league.user_id.toString() === userId;
    } catch (error) {
      throw new DatabaseError('Failed to check if user is league manager', error);
    }
  }

  /**
   * Checks if a user is a member of a team
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const member = await this.db.selectFrom('team_members')
        .selectAll()
        .where('team_id', '=', teamId)
        .where('user_id', '=', userId)
        .where('status', '=', 'active')
        .executeTakeFirst();
      
      return !!member;
    } catch (error) {
      throw new DatabaseError('Failed to check if user is team member', error);
    }
  }

  /**
   * Checks if a user is a captain of a team
   */
  async isTeamCaptain(teamId: string, userId: string): Promise<boolean> {
    try {
      const member = await this.db.selectFrom('team_members')
        .selectAll()
        .where('team_id', '=', teamId)
        .where('user_id', '=', userId)
        .where('role', '=', 'captain')
        .where('status', '=', 'active')
        .executeTakeFirst();

      return !!member;
    } catch (error) {
      throw new DatabaseError('Failed to check if user is team captain', error);
    }
  }

  /**
   * Checks if a user is a member of a league
   */
  async isLeagueMember(leagueId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is in league_members table
      const directMember = await this.db.selectFrom('league_members')
        .select('id')
        .where('league_id', '=', leagueId)
        .where('user_id', '=', userId)
        .executeTakeFirst();
      
      if (directMember) {
        return true;
      }
      
      // Check if user is part of a team in the league
      const teamMember = await this.db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .select('team_members.id')
        .where('teams.league_id', '=', leagueId)
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .executeTakeFirst();
      
      return !!teamMember;
    } catch (error) {
      throw new DatabaseError('Failed to check if user is league member', error);
    }
  }

  /**
   * Creates a new team
   */
  async createTeam(data: {
    league_id: string;
    name: string;
    max_members?: number;
    status?: TeamStatus;
  }): Promise<TeamBasic> {
    try {
      const { league_id, name, max_members = 6, status = 'active' } = data;
      
      const teamId = uuidv4();
      
      const result = await this.db.insertInto('teams')
        .values({
          id: teamId,
          league_id,
          name,
          max_members,
          status: status as TeamStatus
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      return result as TeamBasic;
    } catch (error) {
      throw new DatabaseError('Failed to create team', error);
    }
  }

  /**
   * Updates a team
   */
  async updateTeam(id: string, data: {
    name?: string;
    max_members?: number;
    status?: TeamStatus;
  }): Promise<TeamBasic | null> {
    try {
      const result = await this.db.updateTable('teams')
        .set(data)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
      
      return result as TeamBasic | null;
    } catch (error) {
      throw new DatabaseError('Failed to update team', error);
    }
  }

  /**
   * Adds a member to a team
   */
  async addTeamMember(teamId: string, userId: string, role: TeamMemberRole = 'member'): Promise<TeamMember | null> {
    try {
      // Check if user already exists in the team
      const existingMember = await this.db.selectFrom('team_members')
        .selectAll()
        .where('team_id', '=', teamId)
        .where('user_id', '=', userId)
        .executeTakeFirst();
      
      if (existingMember) {
        // If member exists but is inactive, update to active
        if (existingMember.status === 'inactive') {
          const updated = await this.db.updateTable('team_members')
            .set({ status: 'active', role })
            .where('id', '=', existingMember.id)
            .returningAll()
            .executeTakeFirst();
          
          // Get username for the response
          const user = await this.db.selectFrom('users')
            .select('username')
            .where('id', '=', userId)
            .executeTakeFirst();
          
          return {
            ...updated,
            username: user?.username || 'Unknown'
          } as TeamMember;
        }
        
        // Member already exists and is active
        return null;
      }
      
      // Add new member
      const memberId = uuidv4();
      
      const result = await this.db.insertInto('team_members')
        .values({
          id: memberId,
          team_id: teamId,
          user_id: userId,
          role,
          status: 'active'
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      // Get username for the response
      const user = await this.db.selectFrom('users')
        .select('username')
        .where('id', '=', userId)
        .executeTakeFirst();
      
      return {
        ...result,
        username: user?.username || 'Unknown'
      } as TeamMember;
    } catch (error) {
      throw new DatabaseError('Failed to add team member', error);
    }
  }

  /**
   * Updates a team member's role
   */
  async updateTeamMember(memberId: string, role: TeamMemberRole): Promise<TeamMember | null> {
    try {
      const result = await this.db.updateTable('team_members')
        .set({ role })
        .where('id', '=', memberId)
        .returningAll()
        .executeTakeFirst();
      
      if (!result) {
        return null;
      }
      
      // Get username for the response
      const user = await this.db.selectFrom('users')
        .select('username')
        .where('id', '=', result.user_id)
        .executeTakeFirst();
      
      return {
        ...result,
        username: user?.username || 'Unknown'
      } as TeamMember;
    } catch (error) {
      throw new DatabaseError('Failed to update team member', error);
    }
  }

  /**
   * Removes a member from a team
   */
  async removeTeamMember(memberId: string): Promise<boolean> {
    try {
      const result = await this.db.updateTable('team_members')
        .set({ status: 'inactive' })
        .where('id', '=', memberId)
        .executeTakeFirst();
      
      return !!result;
    } catch (error) {
      throw new DatabaseError('Failed to remove team member', error);
    }
  }

  /**
   * Checks if a team has available spots
   */
  async hasAvailableSpots(teamId: string): Promise<boolean> {
    try {
      const team = await this.db.selectFrom('teams')
        .select(['id', 'max_members'])
        .where('id', '=', teamId)
        .executeTakeFirst();
      
      if (!team) {
        return false;
      }
      
      const memberCount = await this.db.selectFrom('team_members')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('team_id', '=', teamId)
        .where('status', '=', 'active')
        .executeTakeFirst();
      
      return (memberCount?.count || 0) < team.max_members;
    } catch (error) {
      throw new DatabaseError('Failed to check if team has available spots', error);
    }
  }

  /**
   * Creates a join request for a team
   */
  async createJoinRequest(teamId: string, userId: string): Promise<{ id: string }> {
    try {
      const requestId = uuidv4();
      
      await this.db.insertInto('team_join_requests')
        .values({
          id: requestId,
          team_id: teamId,
          user_id: userId,
          status: 'pending'
        })
        .execute();
      
      return { id: requestId };
    } catch (error) {
      throw new DatabaseError('Failed to create join request', error);
    }
  }

  /**
   * Gets pending join requests for a team
   */
  async getTeamJoinRequests(teamId: string): Promise<JoinRequest[]> {
    try {
      return await this.db.selectFrom('team_join_requests')
        .innerJoin('users', 'users.id', 'team_join_requests.user_id')
        .select([
          'team_join_requests.id',
          'team_join_requests.team_id',
          'team_join_requests.user_id',
          'team_join_requests.status',
          'team_join_requests.created_at',
          'users.username'
        ])
        .where('team_id', '=', teamId)
        .where('team_join_requests.status', '=', 'pending')
        .orderBy('team_join_requests.created_at', 'desc')
        .execute();
    } catch (error) {
      throw new DatabaseError('Failed to get team join requests', error);
    }
  }

  /**
   * Approves a join request and adds the user to the team
   */
  async approveJoinRequest(requestId: string): Promise<TeamMember | null> {
    try {
      const request = await this.db.selectFrom('team_join_requests')
        .selectAll()
        .where('id', '=', requestId)
        .where('status', '=', 'pending')
        .executeTakeFirst();
      
      if (!request) {
        return null;
      }
      
      // Update request status
      await this.db.updateTable('team_join_requests')
        .set({ status: 'approved' })
        .where('id', '=', requestId)
        .execute();
      
      // Add user to team
      return await this.addTeamMember(request.team_id, request.user_id);
    } catch (error) {
      throw new DatabaseError('Failed to approve join request', error);
    }
  }

  /**
   * Rejects a join request
   */
  async rejectJoinRequest(requestId: string): Promise<boolean> {
    try {
      const result = await this.db.updateTable('team_join_requests')
        .set({ status: 'rejected' })
        .where('id', '=', requestId)
        .where('status', '=', 'pending')
        .execute();
      
      return !!result;
    } catch (error) {
      throw new DatabaseError('Failed to reject join request', error);
    }
  }

  /**
   * Gets all join requests for a user
   */
  async getUserJoinRequests(userId: string): Promise<JoinRequest[]> {
    try {
      return await this.db.selectFrom('team_join_requests')
        .innerJoin('teams', 'teams.id', 'team_join_requests.team_id')
        .innerJoin('users', 'users.id', 'team_join_requests.user_id')
        .select([
          'team_join_requests.id',
          'team_join_requests.team_id',
          'team_join_requests.user_id',
          'team_join_requests.status',
          'team_join_requests.created_at',
          'users.username',
          'teams.name as team_name'
        ])
        .where('user_id', '=', userId)
        .orderBy('team_join_requests.created_at', 'desc')
        .execute();
    } catch (error) {
      throw new DatabaseError('Failed to get user join requests', error);
    }
  }

  /**
   * Cancels a join request for a user
   */
  async cancelJoinRequest(requestId: string, userId: string): Promise<boolean> {
    try {
      // First verify the request belongs to this user
      const request = await this.db.selectFrom('team_join_requests')
        .selectAll()
        .where('id', '=', requestId)
        .where('user_id', '=', userId)
        .where('status', '=', 'pending')
        .executeTakeFirst();
      
      if (!request) {
        return false;
      }
      
      // Update request status to canceled
      const result = await this.db.updateTable('team_join_requests')
        .set({ status: 'cancelled' })
        .where('id', '=', requestId)
        .execute();
      
      return !!result;
    } catch (error) {
      throw new DatabaseError('Failed to cancel join request', error);
    }
  }
} 