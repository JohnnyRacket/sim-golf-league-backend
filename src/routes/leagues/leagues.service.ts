import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database, LeagueStatus, LeagueMemberRole, LeagueRequestStatus, PaymentType, DayOfWeek } from '../../types/database';
import { LeagueBasic, LeagueDetail, LeagueWithLocation, LocationInfo, OwnerInfo, TeamInfo, LeagueMember } from './leagues.types';

export class LeaguesService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all leagues with optional location filtering
   */
  async getAllLeagues(locationId?: string): Promise<LeagueWithLocation[]> {
    try {
      let query = this.db.selectFrom('leagues')
        .leftJoin('locations', 'locations.id', 'leagues.location_id')
        .leftJoin('owners', 'owners.id', 'locations.owner_id')
        .select([
          'leagues.id',
          'leagues.name',
          'leagues.location_id',
          'leagues.start_date',
          'leagues.end_date',
          'leagues.description',
          'leagues.max_teams',
          'leagues.simulator_settings',
          'leagues.status',
          'leagues.created_at',
          'leagues.updated_at',
          'locations.name as location_name',
          'owners.name as owner_name'
        ]);
      
      if (locationId) {
        query = query.where('leagues.location_id', '=', locationId);
      }
      
      const leagues = await query.execute();
      return leagues as LeagueWithLocation[];
    } catch (error) {
      throw new Error(`Failed to get leagues: ${error}`);
    }
  }

  /**
   * Get leagues that the user is a member of through team membership
   */
  async getLeaguesByUserMembership(userId: string): Promise<any[]> {
    try {
      const leagues = await this.db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .select([
          'leagues.id',
          'leagues.name',
          'leagues.start_date',
          'leagues.end_date',
          'leagues.status',
          'locations.name as location_name',
          'teams.id as team_id',
          'teams.name as team_name'
        ])
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .execute();
      
      return leagues;
    } catch (error) {
      throw new Error(`Failed to get user's leagues: ${error}`);
    }
  }

  /**
   * Get leagues managed by the specified user
   */
  async getLeaguesByManager(userId: string): Promise<LeagueWithLocation[]> {
    try {
      // First, get leagues where the user is a location owner
      const ownerLeagues = await this.db.selectFrom('leagues')
        .leftJoin('locations', 'locations.id', 'leagues.location_id')
        .leftJoin('owners', 'owners.id', 'locations.owner_id')
        .select([
          'leagues.id',
          'leagues.name',
          'leagues.location_id',
          'leagues.start_date',
          'leagues.end_date',
          'leagues.description',
          'leagues.max_teams',
          'leagues.simulator_settings',
          'leagues.status',
          'leagues.created_at',
          'leagues.updated_at',
          'locations.name as location_name',
          'owners.name as owner_name'
        ])
        .where('owners.user_id', '=', userId)
        .execute();
      
      // Now get leagues where the user has a manager role
      const managerRoleLeagues = await this.db.selectFrom('league_members')
        .innerJoin('leagues', 'leagues.id', 'league_members.league_id')
        .leftJoin('locations', 'locations.id', 'leagues.location_id')
        .leftJoin('owners', 'owners.id', 'locations.owner_id')
        .select([
          'leagues.id',
          'leagues.name',
          'leagues.location_id',
          'leagues.start_date',
          'leagues.end_date',
          'leagues.description',
          'leagues.max_teams',
          'leagues.simulator_settings',
          'leagues.status',
          'leagues.created_at',
          'leagues.updated_at',
          'locations.name as location_name',
          'owners.name as owner_name'
        ])
        .where('league_members.user_id', '=', userId)
        .where('league_members.role', '=', 'manager')
        .execute();
      
      // Combine and deduplicate results
      const allLeagues = [...ownerLeagues, ...managerRoleLeagues];
      const uniqueLeagues = Array.from(
        new Map(allLeagues.map(league => [league.id, league])).values()
      );
      
      return uniqueLeagues as LeagueWithLocation[];
    } catch (error) {
      throw new Error(`Failed to get manager's leagues: ${error}`);
    }
  }

  /**
   * Get league by ID with detailed information
   */
  async getLeagueById(id: string): Promise<LeagueDetail | null> {
    try {
      const league = await this.db.selectFrom('leagues')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst() as LeagueBasic | undefined;
      
      if (!league) {
        return null;
      }
      
      // Get location info
      const location = await this.db.selectFrom('locations')
        .select(['id', 'name', 'address'])
        .where('id', '=', league.location_id)
        .executeTakeFirst() as LocationInfo | undefined;
      
      if (!location) {
        return null;
      }
      
      // Get owner info
      const owner = await this.db.selectFrom('owners')
        .innerJoin('locations', 'locations.owner_id', 'owners.id')
        .select(['owners.id', 'owners.name', 'owners.user_id'])
        .where('locations.id', '=', league.location_id)
        .executeTakeFirst() as OwnerInfo | undefined;
      
      // Get teams in the league
      const teams = await this.db.selectFrom('teams')
        .select(['id', 'name', 'max_members'])
        .where('league_id', '=', id)
        .where('status', '=', 'active')
        .execute();
      
      // Get member count for each team
      const teamsWithCount = await Promise.all(teams.map(async (team) => {
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
      
      // Get league members
      const members = await this.getLeagueMembers(id);
      
      return {
        ...league,
        location,
        owner: owner || {
          id: '',
          name: 'Unknown',
          user_id: ''
        },
        teams: teamsWithCount as TeamInfo[],
        members
      };
    } catch (error) {
      throw new Error(`Failed to get league: ${error}`);
    }
  }

  /**
   * Check if user is an owner of the location that a league belongs to
   */
  async isUserLocationManager(locationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.selectFrom('locations')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .select('owners.user_id')
        .where('locations.id', '=', locationId)
        .executeTakeFirst();
      
      return !!result && result.user_id.toString() === userId;
    } catch (error) {
      throw new Error(`Failed to check if user is location owner: ${error}`);
    }
  }

  /**
   * Check if user is manager of the location that owns the league
   */
  async isUserLeagueManager(leagueId: string, userId: string): Promise<boolean> {
    try {
      // First check if the user is a location owner for this league
      const isLocationOwner = await this.db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .select('owners.user_id')
        .where('leagues.id', '=', leagueId)
        .executeTakeFirst();
      
      if (isLocationOwner && isLocationOwner.user_id.toString() === userId) {
        return true;
      }
      
      // Then check if the user has a manager role in the league
      return await this.isUserLeagueMember(leagueId, userId, 'manager');
    } catch (error) {
      throw new Error(`Failed to check if user is league manager: ${error}`);
    }
  }

  /**
   * Check if user is a league member with a specific role
   */
  async isUserLeagueMember(leagueId: string, userId: string, role?: LeagueMemberRole): Promise<boolean> {
    try {
      let query = this.db.selectFrom('league_members')
        .select('id')
        .where('league_id', '=', leagueId)
        .where('user_id', '=', userId);
      
      if (role) {
        query = query.where('role', '=', role);
      }
      
      const member = await query.executeTakeFirst();
      return !!member;
    } catch (error) {
      throw new Error(`Failed to check if user is league member: ${error}`);
    }
  }

  /**
   * Get all members of a league
   */
  async getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
    try {
      const members = await this.db.selectFrom('league_members')
        .innerJoin('users', 'users.id', 'league_members.user_id')
        .select([
          'league_members.id',
          'league_members.user_id',
          'league_members.role',
          'league_members.joined_at',
          'users.username'
        ])
        .where('league_members.league_id', '=', leagueId)
        .execute();
      
      return members as LeagueMember[];
    } catch (error) {
      throw new Error(`Failed to get league members: ${error}`);
    }
  }

  /**
   * Add a user to a league with a specific role
   */
  async addLeagueMember(leagueId: string, userId: string, role: LeagueMemberRole = 'spectator'): Promise<LeagueMember | null> {
    try {
      // Check if user is already a member
      const existingMember = await this.db.selectFrom('league_members')
        .selectAll()
        .where('league_id', '=', leagueId)
        .where('user_id', '=', userId)
        .executeTakeFirst();
      
      if (existingMember) {
        // If role is different, update it
        if (existingMember.role !== role) {
          const updated = await this.db.updateTable('league_members')
            .set({ role })
            .where('id', '=', existingMember.id)
            .returningAll()
            .executeTakeFirst();
          
          return updated as LeagueMember | null;
        }
        
        return existingMember as LeagueMember;
      }
      
      // Add new member
      const memberId = uuidv4();
      
      const result = await this.db.insertInto('league_members')
        .values({
          id: memberId,
          league_id: leagueId,
          user_id: userId,
          role
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
      } as LeagueMember;
    } catch (error) {
      throw new Error(`Failed to add league member: ${error}`);
    }
  }

  /**
   * Update a league member's role
   */
  async updateLeagueMemberRole(memberId: string, role: LeagueMemberRole): Promise<LeagueMember | null> {
    try {
      const result = await this.db.updateTable('league_members')
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
      } as LeagueMember;
    } catch (error) {
      throw new Error(`Failed to update league member role: ${error}`);
    }
  }

  /**
   * Remove a member from a league
   */
  async removeLeagueMember(memberId: string): Promise<boolean> {
    try {
      const result = await this.db.deleteFrom('league_members')
        .where('id', '=', memberId)
        .execute();
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to remove league member: ${error}`);
    }
  }

  /**
   * Create a league membership request
   */
  async createLeagueMembershipRequest(
    leagueId: string,
    userId: string,
    requestedRole: LeagueMemberRole,
    message?: string
  ): Promise<any> {
    try {
      // Check if user is already a member with the requested role
      const existingMember = await this.db.selectFrom('league_members')
        .selectAll()
        .where('league_id', '=', leagueId)
        .where('user_id', '=', userId)
        .where('role', '=', requestedRole)
        .executeTakeFirst();
      
      if (existingMember) {
        throw new Error('User already has the requested role in this league');
      }
      
      // Check for existing pending requests
      const existingRequest = await this.db.selectFrom('league_membership_requests')
        .selectAll()
        .where('league_id', '=', leagueId)
        .where('user_id', '=', userId)
        .where('requested_role', '=', requestedRole)
        .where('status', '=', 'pending')
        .executeTakeFirst();
      
      if (existingRequest) {
        throw new Error('A pending request already exists');
      }
      
      // Create request
      const requestId = uuidv4();
      
      const result = await this.db.insertInto('league_membership_requests')
        .values({
          id: requestId,
          league_id: leagueId,
          user_id: userId,
          requested_role: requestedRole,
          status: 'pending',
          message
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      return result;
    } catch (error) {
      throw new Error(`Failed to create league membership request: ${error}`);
    }
  }

  /**
   * Get pending membership requests for a league
   */
  async getLeagueMembershipRequests(leagueId: string, status: LeagueRequestStatus = 'pending'): Promise<any[]> {
    try {
      const requests = await this.db.selectFrom('league_membership_requests')
        .innerJoin('users', 'users.id', 'league_membership_requests.user_id')
        .select([
          'league_membership_requests.id',
          'league_membership_requests.user_id',
          'league_membership_requests.requested_role',
          'league_membership_requests.message',
          'league_membership_requests.created_at',
          'users.username'
        ])
        .where('league_membership_requests.league_id', '=', leagueId)
        .where('league_membership_requests.status', '=', status)
        .execute();
      
      return requests;
    } catch (error) {
      throw new Error(`Failed to get league membership requests: ${error}`);
    }
  }

  /**
   * Get membership requests created by a user
   */
  async getUserMembershipRequests(userId: string): Promise<any[]> {
    try {
      const requests = await this.db.selectFrom('league_membership_requests')
        .innerJoin('leagues', 'leagues.id', 'league_membership_requests.league_id')
        .select([
          'league_membership_requests.id',
          'league_membership_requests.league_id',
          'league_membership_requests.requested_role',
          'league_membership_requests.status',
          'league_membership_requests.created_at',
          'leagues.name as league_name'
        ])
        .where('league_membership_requests.user_id', '=', userId)
        .execute();
      
      return requests;
    } catch (error) {
      throw new Error(`Failed to get user's membership requests: ${error}`);
    }
  }

  /**
   * Approve a league membership request
   */
  async approveLeagueMembershipRequest(requestId: string): Promise<boolean> {
    try {
      // Get the request details
      const request = await this.db.selectFrom('league_membership_requests')
        .selectAll()
        .where('id', '=', requestId)
        .where('status', '=', 'pending')
        .executeTakeFirst();
      
      if (!request) {
        throw new Error('Request not found or already processed');
      }
      
      // Update request status
      await this.db.updateTable('league_membership_requests')
        .set({ status: 'approved' })
        .where('id', '=', requestId)
        .execute();
      
      // Add or update league member
      await this.addLeagueMember(
        request.league_id,
        request.user_id,
        request.requested_role
      );
      
      return true;
    } catch (error) {
      throw new Error(`Failed to approve league membership request: ${error}`);
    }
  }

  /**
   * Reject a league membership request
   */
  async rejectLeagueMembershipRequest(requestId: string): Promise<boolean> {
    try {
      const result = await this.db.updateTable('league_membership_requests')
        .set({ status: 'rejected' })
        .where('id', '=', requestId)
        .where('status', '=', 'pending')
        .execute();
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to reject league membership request: ${error}`);
    }
  }

  /**
   * Create a new league
   */
  async createLeague(data: {
    name: string;
    location_id: string;
    start_date: string | Date;
    end_date: string | Date;
    description?: string;
    max_teams?: number;
    simulator_settings?: Record<string, unknown>;
    status?: LeagueStatus;
    banner_image_url?: string;
    cost?: number;
    payment_type?: PaymentType;
    day_of_week?: DayOfWeek;
    start_time?: string;
    bays?: string[];
  }): Promise<LeagueBasic> {
    try {
      const { 
        name, 
        location_id, 
        start_date, 
        end_date, 
        description, 
        max_teams = 8, 
        simulator_settings = {}, 
        status = 'pending',
        banner_image_url,
        cost,
        payment_type = 'upfront',
        day_of_week,
        start_time,
        bays
      } = data;

      const leagueId = uuidv4();
      
      const result = await this.db.insertInto('leagues')
        .values({
          id: leagueId,
          name,
          location_id,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          description,
          max_teams,
          simulator_settings,
          status: status as LeagueStatus,
          banner_image_url,
          cost,
          payment_type,
          day_of_week,
          start_time,
          bays
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      return result as LeagueBasic;
    } catch (error) {
      throw new Error(`Failed to create league: ${error}`);
    }
  }

  /**
   * Update an existing league
   */
  async updateLeague(id: string, data: {
    name?: string;
    start_date?: string | Date;
    end_date?: string | Date;
    description?: string;
    max_teams?: number;
    simulator_settings?: Record<string, unknown>;
    status?: LeagueStatus;
    banner_image_url?: string;
    cost?: number;
    payment_type?: PaymentType;
    day_of_week?: DayOfWeek;
    start_time?: string;
    bays?: string[];
  }): Promise<LeagueBasic | null> {
    try {
      // Process date fields if they exist
      const updateData = { ...data };
      if (updateData.start_date) {
        updateData.start_date = new Date(updateData.start_date);
      }
      if (updateData.end_date) {
        updateData.end_date = new Date(updateData.end_date);
      }

      const result = await this.db.updateTable('leagues')
        .set(updateData as any)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
      
      return result as LeagueBasic | null;
    } catch (error) {
      throw new Error(`Failed to update league: ${error}`);
    }
  }

  /**
   * Delete a league (soft delete by changing status to 'inactive')
   */
  async deleteLeague(id: string): Promise<boolean> {
    try {
      // For now, we'll hard delete the league
      const result = await this.db.deleteFrom('leagues')
        .where('id', '=', id)
        .execute();
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete league: ${error}`);
    }
  }

  /**
   * Get league standings (teams sorted by wins)
   */
  async getLeagueStandings(leagueId: string): Promise<any[]> {
    try {
      // First, get all teams in the league
      const teams = await this.db.selectFrom('teams')
        .select(['id', 'name'])
        .where('league_id', '=', leagueId)
        .where('status', '=', 'active')
        .execute();
      
      // Get match results for each team
      const teamResults = await Promise.all(teams.map(async (team) => {
        // Get home matches
        const homeMatches = await this.db.selectFrom('matches')
          .select(['home_team_score', 'away_team_score', 'status'])
          .where('home_team_id', '=', team.id)
          .where('league_id', '=', leagueId)
          .where('status', '=', 'completed')
          .execute();
        
        // Get away matches
        const awayMatches = await this.db.selectFrom('matches')
          .select(['home_team_score', 'away_team_score', 'status'])
          .where('away_team_id', '=', team.id)
          .where('league_id', '=', leagueId)
          .where('status', '=', 'completed')
          .execute();
        
        // Calculate wins, losses, and total matches
        let wins = 0;
        let losses = 0;
        let draws = 0;
        
        // Process home matches
        homeMatches.forEach(match => {
          if (match.home_team_score > match.away_team_score) {
            wins++;
          } else if (match.home_team_score < match.away_team_score) {
            losses++;
          } else {
            draws++;
          }
        });
        
        // Process away matches
        awayMatches.forEach(match => {
          if (match.away_team_score > match.home_team_score) {
            wins++;
          } else if (match.away_team_score < match.home_team_score) {
            losses++;
          } else {
            draws++;
          }
        });
        
        const totalMatches = homeMatches.length + awayMatches.length;
        
        return {
          team_id: team.id,
          team_name: team.name,
          matches_played: totalMatches,
          wins,
          losses,
          draws,
          points: wins * 3 + draws // 3 points for win, 1 for draw
        };
      }));
      
      // Sort by points (descending)
      return teamResults.sort((a, b) => b.points - a.points);
    } catch (error) {
      throw new Error(`Failed to get league standings: ${error}`);
    }
  }
} 