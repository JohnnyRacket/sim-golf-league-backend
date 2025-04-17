import { Kysely, Transaction } from 'kysely';
import { Database, MatchTable, GameFormatType, MatchFormatType, ScoringFormatType } from "../../types/database";
import { MatchStatus } from "../../types/enums";
import { 
  EnhancedMatch, 
  TeamInfo, 
  LeagueInfo, 
  UserMatchSummary, 
  ManagerInfo 
} from "./matches.types";
import { v4 as uuidv4 } from 'uuid';

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
          'matches.id as id',
          'matches.league_id as league_id',
          'matches.home_team_id as home_team_id',
          'matches.away_team_id as away_team_id',
          'matches.match_date as match_date',
          'matches.status as status',
          'matches.home_team_score as home_team_score',
          'matches.away_team_score as away_team_score',
          'matches.player_details as player_details',
          'matches.simulator_settings as simulator_settings',
          'matches.game_format as game_format',
          'matches.match_format as match_format',
          'matches.scoring_format as scoring_format',
          'matches.created_at as created_at',
          'matches.updated_at as updated_at',
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
        game_format: result.game_format as GameFormatType,
        match_format: result.match_format as MatchFormatType,
        scoring_format: result.scoring_format as ScoringFormatType,
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
          'matches.id as id',
          'matches.league_id as league_id',
          'matches.home_team_id as home_team_id',
          'matches.away_team_id as away_team_id',
          'matches.match_date as match_date',
          'matches.status as status',
          'matches.home_team_score as home_team_score',
          'matches.away_team_score as away_team_score',
          'matches.player_details as player_details',
          'matches.simulator_settings as simulator_settings',
          'matches.game_format as game_format',
          'matches.match_format as match_format',
          'matches.scoring_format as scoring_format',
          'matches.created_at as created_at',
          'matches.updated_at as updated_at',
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
        game_format: result.game_format as GameFormatType,
        match_format: result.match_format as MatchFormatType,
        scoring_format: result.scoring_format as ScoringFormatType,
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
   * Submits match results including player details and updates team stats
   */
  async submitMatchResults(
    matchId: string, 
    homeTeamScore: number, 
    awayTeamScore: number,
    playerDetails: Record<string, any> 
  ): Promise<MatchTable | null> {
    try {
      // Start transaction
      const updatedMatch = await this.db.transaction().execute(async (transaction) => {
        const match = await transaction.selectFrom('matches')
          .select(['id', 'league_id', 'home_team_id', 'away_team_id'])
          .where('id', '=', matchId)
          .executeTakeFirst();

        if (!match) {
          throw new Error('Match not found for results submission.');
        }
        
        // Update match scores and status
        const result = await transaction.updateTable('matches')
          .set({
            home_team_score: homeTeamScore,
            away_team_score: awayTeamScore,
            player_details: playerDetails,
            status: 'completed' as MatchStatus
          })
          .where('id', '=', matchId)
          .returningAll()
          .executeTakeFirstOrThrow();
        
        // Update team stats based on match outcome
        await this.updateTeamStats(transaction, match.league_id, match.home_team_id, match.away_team_id, homeTeamScore, awayTeamScore);
        
        return result as any as MatchTable | null;
      });
      
      return updatedMatch;
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
      // First check if user is an admin (admins have league manager privileges)
      const adminUser = await this.db.selectFrom('users')
        .select('id')
        .where('id', '=', userId)
        .where('role', '=', 'admin')
        .executeTakeFirst();
      
      if (adminUser) {
        return true; // Admin users have league manager privileges
      }
      
      // Get the league ID for this match
      const match = await this.db.selectFrom('matches')
        .select('league_id')
        .where('id', '=', matchId)
        .executeTakeFirst();
      
      if (!match) {
        return false;
      }
      
      // Check if user is explicitly assigned as a league manager
      const leagueMember = await this.db.selectFrom('league_members')
        .select('id')
        .where('user_id', '=', userId)
        .where('league_id', '=', match.league_id)
        .where('role', '=', 'manager')
        .executeTakeFirst();
      
      if (leagueMember) {
        return true;
      }
      
      // Also check location owner (backward compatibility)
      const isOwner = await this.db.selectFrom('matches')
        .innerJoin('leagues', 'leagues.id', 'matches.league_id')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .select('owners.user_id')
        .where('matches.id', '=', matchId)
        .executeTakeFirst();
      
      return isOwner ? isOwner.user_id.toString() === userId : false;
    } catch (error) {
      throw new Error(`Failed to check if user is league manager: ${error}`);
    }
  }
  
  /**
   * Gets the manager info for a league
   */
  async getLeagueManager(leagueId: string): Promise<ManagerInfo | null> {
    try {
      // First check if the user is an admin
      const adminUser = await this.db.selectFrom('users')
        .select('id as user_id')
        .where('role', '=', 'admin')
        .executeTakeFirst();
      
      if (adminUser) {
        return { user_id: adminUser.user_id };
      }
      
      // Check if there are league members with manager role
      const leagueManager = await this.db.selectFrom('league_members')
        .select('user_id')
        .where('league_id', '=', leagueId)
        .where('role', '=', 'manager')
        .executeTakeFirst();
      
      if (leagueManager) {
        return { user_id: leagueManager.user_id };
      }
      
      // Fallback to the owner check from the previous implementation
      const owner = await this.db.selectFrom('leagues')
        .innerJoin('locations', 'locations.id', 'leagues.location_id')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .select('owners.user_id')
        .where('leagues.id', '=', leagueId)
        .executeTakeFirst();
      
      if (!owner) {
        return null;
      }
      
      return { user_id: owner.user_id };
    } catch (error) {
      throw new Error(`Failed to get league manager: ${error}`);
    }
  }

  /**
   * Gets match summaries for a user across all their teams
   * NOTE: This might need adjustment or removal depending on how user stats are handled now.
   * Keeping it for now but it relies on player_details which is user-centric.
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
              stats.matches_played++; // This seems incorrect for game-level stats, should it track match appearances?
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

  // Helper method to update team stats after a match is completed
  private async updateTeamStats(transaction: Transaction<Database>, leagueId: string, homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Promise<void> {
    try {
      // Determine win/loss/draw for each team
      let homeWins = 0, homeLosses = 0, homeDraws = 0;
      let awayWins = 0, awayLosses = 0, awayDraws = 0;

      if (homeScore > awayScore) {
        homeWins = 1;
        awayLosses = 1;
      } else if (awayScore > homeScore) {
        awayWins = 1;
        homeLosses = 1;
      } else {
        homeDraws = 1;
        awayDraws = 1;
      }

      const teamsToUpdate = [
        { teamId: homeTeamId, wins: homeWins, losses: homeLosses, draws: homeDraws },
        { teamId: awayTeamId, wins: awayWins, losses: awayLosses, draws: awayDraws }
      ];

      for (const teamUpdate of teamsToUpdate) {
        // Check if stats entry exists
        const existingStat = await transaction.selectFrom('stats')
          .select('id')
          .where('team_id', '=', teamUpdate.teamId)
          .where('league_id', '=', leagueId)
          .executeTakeFirst();

        if (existingStat) {
          // Update existing stats
          await transaction.updateTable('stats')
            .set((eb: any) => ({
              matches_played: eb('matches_played', '+', 1),
              matches_won: eb('matches_won', '+', teamUpdate.wins),
              matches_lost: eb('matches_lost', '+', teamUpdate.losses),
              matches_drawn: eb('matches_drawn', '+', teamUpdate.draws),
            }))
            .where('id', '=', existingStat.id)
            .execute();
        } else {
          // Create new stats entry
          const statId = uuidv4(); // Generate UUID for new stat
          await transaction.insertInto('stats')
            .values({
              id: statId,
              team_id: teamUpdate.teamId,
              league_id: leagueId,
              matches_played: 1,
              matches_won: teamUpdate.wins,
              matches_lost: teamUpdate.losses,
              matches_drawn: teamUpdate.draws,
            })
            .execute();
        }
      }
    } catch (error) {
      // Log error but don't let stats update failure break the main operation
      console.error(`Error updating team stats for league ${leagueId}, teams ${homeTeamId} vs ${awayTeamId}:`, error);
    }
  }

  /**
   * Updates all matches for a specific day of a league
   * @param leagueId - ID of the league
   * @param date - Date string for which to update matches (YYYY-MM-DD)
   * @param updates - Fields to update across all matches (match_date, game_format, match_format, scoring_format)
   * @returns Object containing information about updated matches
   */
  async bulkUpdateMatchesForDay(
    leagueId: string,
    date: string,
    updates: Partial<{
      match_date: Date;
      game_format: GameFormatType;
      match_format: MatchFormatType;
      scoring_format: ScoringFormatType;
    }>
  ): Promise<{
    matches_updated: number;
    matches: Array<{ id: string; match_date: Date }>;
  }> {
    try {
      // Parse the date to get start and end times for the day
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      // First, find all matches for this league on the given day
      const matchesToUpdate = await this.db.selectFrom('matches')
        .select(['id', 'match_date'])
        .where('league_id', '=', leagueId)
        .where('match_date', '>=', startOfDay)
        .where('match_date', '<=', endOfDay)
        .execute();
      
      if (matchesToUpdate.length === 0) {
        return {
          matches_updated: 0,
          matches: []
        };
      }
      
      // Extract match IDs for the update operation
      const matchIds = matchesToUpdate.map(match => match.id);
      
      // Check if there are any actual updates to apply
      if (Object.keys(updates).length === 0) {
        return {
          matches_updated: 0,
          matches: matchesToUpdate.map(match => ({
            id: match.id,
            match_date: match.match_date
          }))
        };
      }
      
      // Perform the update transaction
      const updatedMatches = await this.db.transaction().execute(async (transaction) => {
        // Build the update query with only the fields that need to be updated
        let updateQuery = transaction.updateTable('matches');
        
        if (updates.match_date) {
          updateQuery = updateQuery.set({ match_date: updates.match_date });
        }
        
        if (updates.game_format) {
          updateQuery = updateQuery.set({ game_format: updates.game_format });
        }
        
        if (updates.match_format) {
          updateQuery = updateQuery.set({ match_format: updates.match_format });
        }
        
        if (updates.scoring_format) {
          updateQuery = updateQuery.set({ scoring_format: updates.scoring_format });
        }
        
        // Add the where clause to limit to the matches we want to update
        updateQuery = updateQuery.where('id', 'in', matchIds);
        
        // Execute the update
        await updateQuery.execute();
        
        // Return the updated matches
        const updatedMatchesQuery = await transaction.selectFrom('matches')
          .select(['id', 'match_date'])
          .where('id', 'in', matchIds)
          .execute();
          
        return updatedMatchesQuery;
      });
      
      return {
        matches_updated: updatedMatches.length,
        matches: updatedMatches.map(match => ({
          id: match.id,
          match_date: match.match_date
        }))
      };
    } catch (error) {
      throw new Error(`Failed to bulk update matches: ${error}`);
    }
  }
} 