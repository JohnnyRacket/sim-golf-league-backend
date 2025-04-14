import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database, LeagueStatus } from '../../types/database';
import { LeagueBasic, LeagueDetail, LeagueWithLocation, LocationInfo, ManagerInfo, TeamInfo } from './leagues.types';

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
        .leftJoin('managers', 'managers.id', 'locations.manager_id')
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
          'managers.name as manager_name'
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
      const leagues = await this.db.selectFrom('leagues')
        .leftJoin('locations', 'locations.id', 'leagues.location_id')
        .leftJoin('managers', 'managers.id', 'locations.manager_id')
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
          'managers.name as manager_name'
        ])
        .where('managers.user_id', '=', userId)
        .execute();
      
      return leagues as LeagueWithLocation[];
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
      
      // Get manager info
      const manager = await this.db.selectFrom('managers')
        .innerJoin('locations', 'locations.manager_id', 'managers.id')
        .select(['managers.id', 'managers.name', 'managers.user_id'])
        .where('locations.id', '=', league.location_id)
        .executeTakeFirst() as ManagerInfo | undefined;
      
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
      
      return {
        ...league,
        location,
        manager: manager || {
          id: '',
          name: 'Unknown',
          user_id: ''
        },
        teams: teamsWithCount as TeamInfo[]
      };
    } catch (error) {
      throw new Error(`Failed to get league: ${error}`);
    }
  }

  /**
   * Check if user is manager of the location that a league belongs to
   */
  async isUserLocationManager(locationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.selectFrom('locations')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('locations.id', '=', locationId)
        .executeTakeFirst();
      
      return !!result && result.user_id.toString() === userId;
    } catch (error) {
      throw new Error(`Failed to check if user is location manager: ${error}`);
    }
  }

  /**
   * Check if user is manager of the location that owns the league
   */
  async isUserLeagueManager(leagueId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('leagues.id', '=', leagueId)
        .executeTakeFirst();
      
      return !!result && result.user_id.toString() === userId;
    } catch (error) {
      throw new Error(`Failed to check if user is league manager: ${error}`);
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
    simulator_settings?: Record<string, any>;
    status?: LeagueStatus;
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
        status = 'pending' 
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
          status: status as LeagueStatus
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
    simulator_settings?: Record<string, any>;
    status?: LeagueStatus;
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