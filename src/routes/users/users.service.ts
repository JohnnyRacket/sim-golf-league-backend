import { Kysely } from 'kysely';
import { Database } from '../../types/database';
import {
  UserProfile,
  UserDashboard,
  UpdateUserBody
} from './users.types';
import { DatabaseError } from '../../utils/errors';

export class UsersService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all users (basic info)
   */
  async getAllUsers() {
    try {
      return await this.db.selectFrom('users')
        .select(['id', 'username', 'email', 'created_at', 'updated_at'])
        .execute();
    } catch (error) {
      throw new DatabaseError('Failed to get users', error);
    }
  }

  /**
   * Get user by ID (basic info)
   */
  async getUserById(id: string) {
    try {
      const user = await this.db.selectFrom('users')
        .select(['id', 'username', 'email', 'created_at', 'updated_at'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      return user;
    } catch (error) {
      throw new DatabaseError('Failed to get user', error);
    }
  }

  /**
   * Get current user profile (with owner info)
   */
  async getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.db.selectFrom('users')
        .select(['id', 'username', 'email', 'role', 'created_at', 'updated_at'])
        .where('id', '=', userId)
        .executeTakeFirst();
      
      if (!user) {
        return null;
      }
      
      // Check if user is an owner
      const owner = await this.db.selectFrom('owners')
        .select(['id', 'name'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
        
      // Manually construct the object matching UserProfile type
      const userProfileData = {
        ...user,
        role: user.role as string, // Cast enum to string if necessary
        created_at: user.created_at.toISOString(), // Convert Date to string
        updated_at: user.updated_at.toISOString(), // Convert Date to string
        is_owner: !!owner,
        owner_details: owner ? { id: owner.id, name: owner.name } : undefined
      };

      return userProfileData as UserProfile; // Assert as UserProfile

    } catch (error) {
      throw new DatabaseError('Failed to get user profile', error);
    }
  }

  /**
   * Get user dashboard data
   */
  async getUserDashboard(userId: string): Promise<UserDashboard> {
    try {
      // Get user's teams
      const teams = await this.db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .select([
          'teams.id as team_id',
          'teams.name as team_name',
          'team_members.role as member_role',
          'leagues.id as league_id',
          'leagues.name as league_name',
          'leagues.status as league_status'
        ])
        .where('team_members.user_id', '=', userId)
        .where('team_members.status', '=', 'active')
        .execute();
      
      // Get upcoming matches
      const upcomingMatches = await this.db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .leftJoin('team_members', eb => 
          eb.on(eb2 => eb2.or([
            eb2('team_members.team_id', '=', eb2.ref('home_team.id')),
            eb2('team_members.team_id', '=', eb2.ref('away_team.id'))
          ]))
        )
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name'
        ])
        .where('team_members.user_id', '=', userId)
        .where('matches.status', '=', 'scheduled')
        .where('matches.match_date', '>', new Date())
        .orderBy('matches.match_date', 'asc')
        .limit(5)
        .execute();
      
      // Get recent match results
      const recentMatches = await this.db.selectFrom('matches')
        .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .leftJoin('team_members', eb => 
          eb.on(eb2 => eb2.or([
            eb2('team_members.team_id', '=', eb2.ref('home_team.id')),
            eb2('team_members.team_id', '=', eb2.ref('away_team.id'))
          ]))
        )
        .select([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id as home_team_id',
          'home_team.name as home_team_name',
          'away_team.id as away_team_id',
          'away_team.name as away_team_name',
          'matches.home_team_score',
          'matches.away_team_score'
        ])
        .where('team_members.user_id', '=', userId)
        .where('matches.status', '=', 'completed')
        .groupBy([
          'matches.id',
          'matches.match_date',
          'matches.status',
          'home_team.id',
          'home_team.name',
          'away_team.id',
          'away_team.name',
          'matches.home_team_score',
          'matches.away_team_score'
        ])
        .orderBy('matches.match_date', 'desc')
        .limit(5)
        .execute();
      
      // Return dashboard data without stats
      const dashboardData = {
        teams: teams.map(t => ({ ...t, league_status: t.league_status as string })), // Ensure enums match string type if needed
        upcoming_matches: upcomingMatches.map(m => ({
          ...m,
          match_date: m.match_date.toISOString(), // Convert Date to string
          status: m.status as string
        })),
        recent_matches: recentMatches.map(m => ({
          ...m,
          match_date: m.match_date.toISOString(), // Convert Date to string
          status: m.status as string
        })),
        league_summaries: [], // Provide empty array for now
      };

      return dashboardData as UserDashboard; // Assert final structure matches type

    } catch (error) {
      throw new DatabaseError('Failed to get user dashboard', error);
    }
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, data: UpdateUserBody): Promise<boolean> {
    try {
      const result = await this.db.updateTable('users')
        .set(data)
        .where('id', '=', id)
        .executeTakeFirst();

      return !!result && result.numUpdatedRows > BigInt(0);
    } catch (error) {
      throw new DatabaseError('Failed to update user', error);
    }
  }
} 