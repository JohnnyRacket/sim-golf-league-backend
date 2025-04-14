import { Kysely } from 'kysely';
import { Database, MatchTable } from "../types/database";
import { MatchStatus } from "../types/enums";

export class MatchesService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

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
      
      return result as any as MatchTable | null;
    } catch (error) {
      throw new Error(`Failed to submit match results: ${error}`);
    }
  }

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
} 