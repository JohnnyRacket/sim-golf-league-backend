import { Kysely } from 'kysely';
import { Database, MatchTable } from "../../types/database";
import { MatchStatus } from "../../types/enums";
import { 
  EnhancedMatch, 
  TeamInfo, 
  LeagueInfo, 
  UserMatchSummary, 
  ManagerInfo 
} from "./matches.types";

export class MatchesService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Creates a new match in the database
   */
  async createMatch(matchData: Omit<MatchTable, "id" | "created_at" | "updated_at">): Promise<MatchTable> {
    try {
      const result = await this.db.insertInto('matches')
        .values({
          ...matchData,
          created_at: undefined,
          updated_at: undefined
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();
      return result as any as MatchTable;
    } catch (error) {
      throw new Error(`Failed to create match: ${error}`);
    }
  }

  /**
   * Gets a match by ID
   */
  async getMatchById(id: string): Promise<MatchTable | null> {
    try {
      const match = await this.db.selectFrom('matches')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      return match as any as MatchTable | null;
    } catch (error) {
      throw new Error(`Failed to get match: ${error}`);
    }
  }

  /**
   * Gets a match by ID with related team and league info
   */
  async getEnhancedMatchById(id: string): Promise<EnhancedMatch | null> {
    try {
      // Use a single JOIN query instead of multiple separate queries
      const result = await this.db.selectFrom('matches')
        .leftJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .leftJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .leftJoin('leagues', 'leagues.id', 'matches.league_id')
        .select([
          'matches.id',
          'matches.league_id',
          'matches.home_team_id',
          'matches.away_team_id',
          'matches.match_date',
          'matches.status',
          'matches.home_team_score',
          'matches.away_team_score',
          'matches.player_details',
          'matches.simulator_settings',
          'matches.created_at',
          'matches.updated_at',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name', 
          'leagues.name as league_name'
        ])
        .where('matches.id', '=', id)
        .executeTakeFirst();

      if (!result) {
        return null;
      }

      // Transform the result to match the expected interface
      return {
        id: result.id,
        league_id: result.league_id,
        home_team_id: result.home_team_id,
        away_team_id: result.away_team_id,
        match_date: result.match_date,
        status: result.status as MatchStatus,
        home_team_score: result.home_team_score,
        away_team_score: result.away_team_score,
        player_details: result.player_details,
        simulator_settings: result.simulator_settings,
        created_at: result.created_at,
        updated_at: result.updated_at,
        home_team: result.home_team_name ? { 
          id: result.home_team_id, 
          name: result.home_team_name 
        } : undefined,
        away_team: result.away_team_name ? { 
          id: result.away_team_id, 
          name: result.away_team_name 
        } : undefined,
        league: result.league_name ? { 
          id: result.league_id, 
          name: result.league_name 
        } : undefined
      } as EnhancedMatch;
    } catch (error) {
      throw new Error(`Failed to get enhanced match: ${error}`);
    }
  }

  /**
   * Gets matches with optional filtering
   */
  async getMatches(filters: Partial<{ 
    league_id: string; 
    team_id: string; 
    status: MatchStatus; 
    start_date: Date; 
    end_date: Date;
    user_id: string;
  }> = {}): Promise<MatchTable[]> {
    try {
      let query = this.db.selectFrom('matches').selectAll();
      
      if (filters.league_id) {
        query = query.where('league_id', '=', filters.league_id);
      }
      
      if (filters.status) {
        query = query.where('status', '=', filters.status);
      }
      
      if (filters.start_date) {
        query = query.where('match_date', '>=', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.where('match_date', '<=', filters.end_date);
      }
      
      if (filters.team_id) {
        const teamId = filters.team_id;
        if (teamId) {
          query = query.where(eb => eb.or([
            eb('home_team_id', '=', teamId),
            eb('away_team_id', '=', teamId)
          ]));
        }
      }
      
      if (filters.user_id) {
        const teamMemberships = await this.db.selectFrom('team_members')
          .select('team_id')
          .where('user_id', '=', filters.user_id)
          .execute();
        
        const teamIds = teamMemberships.map(tm => tm.team_id);
        
        if (teamIds.length > 0) {
          query = query.where(eb => eb.or([
            eb('home_team_id', 'in', teamIds),
            eb('away_team_id', 'in', teamIds)
          ]));
        } else {
          return [];
        }
      }
      
      const matches = await query.orderBy('match_date').execute();
      return matches as any as MatchTable[];
    } catch (error) {
      throw new Error(`Failed to get matches: ${error}`);
    }
  }

  /**
   * Gets enhanced matches with team and league info
   */
  async getEnhancedMatches(filters: Partial<{ 
    league_id: string; 
    team_id: string; 
    status: MatchStatus; 
    start_date: Date; 
    end_date: Date;
    user_id: string;
  }> = {}): Promise<EnhancedMatch[]> {
    try {
      // Start building the query with JOINs
      let query = this.db.selectFrom('matches')
        .leftJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .leftJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .leftJoin('leagues', 'leagues.id', 'matches.league_id')
        .select([
          'matches.id',
          'matches.league_id',
          'matches.home_team_id',
          'matches.away_team_id',
          'matches.match_date',
          'matches.status',
          'matches.home_team_score',
          'matches.away_team_score',
          'matches.player_details',
          'matches.simulator_settings',
          'matches.created_at',
          'matches.updated_at',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name', 
          'leagues.name as league_name'
        ]);
      
      // Apply filters
      if (filters.league_id) {
        query = query.where('matches.league_id', '=', filters.league_id);
      }
      
      if (filters.status) {
        query = query.where('matches.status', '=', filters.status);
      }
      
      if (filters.start_date) {
        query = query.where('matches.match_date', '>=', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.where('matches.match_date', '<=', filters.end_date);
      }
      
      if (filters.team_id) {
        const teamId = filters.team_id;
        if (teamId) {
          query = query.where(eb => eb.or([
            eb('matches.home_team_id', '=', teamId),
            eb('matches.away_team_id', '=', teamId)
          ]));
        }
      }
      
      // If filtering by user, first get their team memberships
      if (filters.user_id) {
        const teamMemberships = await this.db.selectFrom('team_members')
          .select('team_id')
          .where('user_id', '=', filters.user_id)
          .execute();
        
        const teamIds = teamMemberships.map(tm => tm.team_id);
        
        if (teamIds.length > 0) {
          query = query.where(eb => eb.or([
            eb('matches.home_team_id', 'in', teamIds),
            eb('matches.away_team_id', 'in', teamIds)
          ]));
        } else {
          return []; // No teams, so no matches
        }
      }
      
      // Order the matches by date
      query = query.orderBy('matches.match_date');
      
      // Execute the query
      const results = await query.execute();
      
      // Transform the results to match the expected interface
      return results.map(result => ({
        id: result.id,
        league_id: result.league_id,
        home_team_id: result.home_team_id,
        away_team_id: result.away_team_id,
        match_date: result.match_date,
        status: result.status as MatchStatus,
        home_team_score: result.home_team_score,
        away_team_score: result.away_team_score,
        player_details: result.player_details,
        simulator_settings: result.simulator_settings,
        created_at: result.created_at,
        updated_at: result.updated_at,
        home_team: result.home_team_name ? { 
          id: result.home_team_id, 
          name: result.home_team_name 
        } : undefined,
        away_team: result.away_team_name ? { 
          id: result.away_team_id, 
          name: result.away_team_name 
        } : undefined,
        league: result.league_name ? { 
          id: result.league_id, 
          name: result.league_name 
        } : undefined
      })) as EnhancedMatch[];
    } catch (error) {
      throw new Error(`Failed to get enhanced matches: ${error}`);
    }
  }

  /**
   * Updates an existing match
   */
  async updateMatch(id: string, data: Partial<Omit<MatchTable, "id" | "created_at" | "updated_at">>): Promise<MatchTable | null> {
    try {
      const result = await this.db.updateTable('matches')
        .set(data as any)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
      
      return result as any as MatchTable | null;
    } catch (error) {
      throw new Error(`Failed to update match: ${error}`);
    }
  }

  /**
   * Submits match results including player details
   */
  async submitMatchResults(
    matchId: string, 
    homeTeamScore: number, 
    awayTeamScore: number,
    playerDetails: Record<string, any>
  ): Promise<MatchTable | null> {
    try {
      const result = await this.db.updateTable('matches')
        .set({
          home_team_score: homeTeamScore,
          away_team_score: awayTeamScore,
          player_details: playerDetails,
          status: 'completed' as MatchStatus
        })
        .where('id', '=', matchId)
        .returningAll()
        .executeTakeFirst();
      
      // Update player stats
      await this.updatePlayerStats(matchId, playerDetails);
      
      return result as any as MatchTable | null;
    } catch (error) {
      throw new Error(`Failed to submit match results: ${error}`);
    }
  }

  /**
   * Deletes a match
   */
  async deleteMatch(id: string): Promise<boolean> {
    try {
      const result = await this.db.deleteFrom('matches')
        .where('id', '=', id)
        .execute();
      
      const deletedCount = result.length > 0 ? 1 : 0;
      return deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete match: ${error}`);
    }
  }

  /**
   * Checks if a user is the manager of the league a match belongs to
   */
  async isLeagueManager(matchId: string, userId: string): Promise<boolean> {
    try {
      // Use a single query with multiple JOINs
      const match = await this.db.selectFrom('matches')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('matches.id', '=', matchId)
        .executeTakeFirst();
      
      if (!match) {
        return false;
      }
      
      return match.user_id.toString() === userId;
    } catch (error) {
      throw new Error(`Failed to check if user is league manager: ${error}`);
    }
  }
  
  /**
   * Gets the manager info for a league
   */
  async getLeagueManager(leagueId: string): Promise<ManagerInfo | null> {
    try {
      // Use a single query with JOINs to get the manager info
      const manager = await this.db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('leagues.id', '=', leagueId)
        .executeTakeFirst();
      
      if (!manager) {
        return null;
      }
      
      return { user_id: manager.user_id };
    } catch (error) {
      throw new Error(`Failed to get league manager: ${error}`);
    }
  }

  /**
   * Gets match summaries for a user across all their teams
   */
  async getUserMatchSummaries(userId: string): Promise<UserMatchSummary[]> {
    try {
      // First, get all team memberships for the user in a single query
      const userTeamMemberships = await this.db.selectFrom('team_members')
        .innerJoin('teams', 'teams.id', 'team_members.team_id')
        .innerJoin('leagues', 'leagues.id', 'teams.league_id')
        .select([
          'team_members.id as team_member_id',
          'teams.id as team_id',
          'teams.name as team_name',
          'leagues.id as league_id',
          'leagues.name as league_name'
        ])
        .where('team_members.user_id', '=', userId)
        .execute();
      
      // No teams, return empty array
      if (userTeamMemberships.length === 0) {
        return [];
      }

      // Get all team IDs the user belongs to
      const teamIds = userTeamMemberships.map(tm => tm.team_id);
      const teamMemberIds = userTeamMemberships.map(tm => tm.team_member_id);
      
      // Get all completed matches for all the user's teams in a single query
      const matches = await this.db.selectFrom('matches')
        .select(['id', 'player_details', 'league_id'])
        .where(eb => eb.or([
          eb('home_team_id', 'in', teamIds),
          eb('away_team_id', 'in', teamIds)
        ]))
        .where('status', '=', 'completed' as MatchStatus)
        .execute();
      
      // Create a map of team_member_id -> team/league info for quick lookups
      const teamMemberMap = new Map<string, {
        team_id: string;
        team_name: string;
        league_id: string;
        league_name: string;
      }>();
      
      userTeamMemberships.forEach(tm => {
        teamMemberMap.set(tm.team_member_id, {
          team_id: tm.team_id,
          team_name: tm.team_name,
          league_id: tm.league_id,
          league_name: tm.league_name
        });
      });
      
      // Create a map to accumulate stats per league/team
      const statsByLeagueTeam = new Map<string, {
        league_id: string;
        league_name: string;
        team_id: string;
        team_name: string;
        matches_played: number;
        games_won: number;
        total_score: number;
        games_played: number;
      }>();
      
      // Process all matches
      matches.forEach(match => {
        if (match.player_details) {
          // Check all player details entries
          Object.entries(match.player_details).forEach(([playerId, details]: [string, any]) => {
            // If this player is the current user (in one of their team memberships)
            if (teamMemberIds.includes(playerId)) {
              const teamInfo = teamMemberMap.get(playerId);
              if (!teamInfo) return; // Shouldn't happen, but just in case
              
              // Create a unique key for this league/team combination
              const key = `${teamInfo.league_id}_${teamInfo.team_id}`;
              
              // Get or create stats object for this league/team
              let stats = statsByLeagueTeam.get(key);
              if (!stats) {
                stats = {
                  league_id: teamInfo.league_id,
                  league_name: teamInfo.league_name,
                  team_id: teamInfo.team_id,
                  team_name: teamInfo.team_name,
                  matches_played: 0,
                  games_won: 0,
                  total_score: 0,
                  games_played: 0
                };
                statsByLeagueTeam.set(key, stats);
              }
              
              // Update stats
              stats.matches_played++;
              stats.games_played++;
              stats.total_score += details.score || 0;
              
              // Check if player won this game
              if (details.score > details.opponent_score) {
                stats.games_won++;
              }
            }
          });
        }
      });
      
      // Convert the map to an array of summaries
      return Array.from(statsByLeagueTeam.values()).map(stats => ({
        league_id: stats.league_id,
        league_name: stats.league_name,
        team_id: stats.team_id,
        team_name: stats.team_name,
        matches_played: stats.matches_played,
        games_won: stats.games_won,
        average_score: stats.games_played > 0 ? stats.total_score / stats.games_played : 0
      }));
    } catch (error) {
      throw new Error(`Failed to get user match summaries: ${error}`);
    }
  }

  /**
   * Verifies that teams exist and are part of the specified league
   * @returns Object containing both teams or null if verification fails
   */
  async verifyTeamsForMatch(homeTeamId: string, awayTeamId: string, leagueId: string): Promise<{
    homeTeam: TeamInfo,
    awayTeam: TeamInfo
  } | null> {
    try {
      // Check if teams are the same
      if (homeTeamId === awayTeamId) {
        return null;
      }
      
      // Verify home team exists and is in the specified league
      const homeTeam = await this.db.selectFrom('teams')
        .select(['id', 'name'])
        .where('id', '=', homeTeamId)
        .where('league_id', '=', leagueId)
        .executeTakeFirst();
      
      if (!homeTeam) {
        return null;
      }
      
      // Verify away team exists and is in the specified league
      const awayTeam = await this.db.selectFrom('teams')
        .select(['id', 'name'])
        .where('id', '=', awayTeamId)
        .where('league_id', '=', leagueId)
        .executeTakeFirst();
      
      if (!awayTeam) {
        return null;
      }
      
      return { homeTeam, awayTeam };
    } catch (error) {
      throw new Error(`Failed to verify teams: ${error}`);
    }
  }

  // Helper method to update player stats
  private async updatePlayerStats(matchId: string, playerDetails: Record<string, any>): Promise<void> {
    try {
      // Get match data
      const match = await this.db.selectFrom('matches')
        .select(['id', 'league_id'])
        .where('id', '=', matchId)
        .executeTakeFirst();
      
      if (!match) return;
      
      const leagueId = match.league_id;
      
      // Get all player IDs from the details
      const playerIds = Object.keys(playerDetails);
      if (playerIds.length === 0) return;
      
      // Get all team members in a single query
      const teamMembers = await this.db.selectFrom('team_members')
        .select(['id', 'user_id'])
        .where('id', 'in', playerIds)
        .execute();
      
      // Create a map of player ID to user ID
      const playerToUserMap = new Map<string, string>();
      teamMembers.forEach(tm => {
        playerToUserMap.set(tm.id, tm.user_id);
      });
      
      // Collect stats by user ID
      const userStats = new Map<string, { games_played: number, games_won: number, total_score: number }>();
      
      // Process player details
      for (const playerId in playerDetails) {
        const userId = playerToUserMap.get(playerId);
        if (!userId) continue;
        
        const playerData = playerDetails[playerId];
        
        if (!userStats.has(userId)) {
          userStats.set(userId, { games_played: 0, games_won: 0, total_score: 0 });
        }
        
        const stats = userStats.get(userId)!;
        stats.games_played += 1;
        
        if (playerData.score !== undefined && playerData.score !== null) {
          stats.total_score += playerData.score;
          
          // Determine win/loss based on opponent score
          if (playerData.opponent_score !== undefined && playerData.opponent_score !== null && 
              playerData.score > playerData.opponent_score) {
            stats.games_won += 1;
          }
        }
      }
      
      // Get all user IDs
      const userIds = Array.from(userStats.keys());
      if (userIds.length === 0) return;
      
      // Get existing stats for all users in a single query
      const existingStats = await this.db.selectFrom('stats')
        .select(['id', 'user_id', 'matches_played', 'matches_won', 'total_score'])
        .where('user_id', 'in', userIds)
        .where('league_id', '=', leagueId)
        .execute();
      
      // Create a map of user ID to existing stats
      const existingStatsMap = new Map();
      existingStats.forEach(stat => {
        existingStatsMap.set(stat.user_id, stat);
      });
      
      // Process each user's stats
      for (const [userId, stats] of userStats.entries()) {
        const existingStat = existingStatsMap.get(userId);
        
        if (existingStat) {
          // Update existing stats
          await this.db.updateTable('stats')
            .set({
              matches_played: existingStat.matches_played + stats.games_played,
              matches_won: existingStat.matches_won + stats.games_won,
              total_score: existingStat.total_score + stats.total_score
            } as any)
            .where('id', '=', existingStat.id)
            .execute();
        } else {
          // Create new stats
          await this.db.insertInto('stats')
            .values({
              user_id: userId,
              league_id: leagueId,
              matches_played: stats.games_played,
              matches_won: stats.games_won,
              total_score: stats.total_score,
              handicap: 0 // Default handicap
            } as any)
            .execute();
        }
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }
} 