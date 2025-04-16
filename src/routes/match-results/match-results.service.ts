import { Kysely } from 'kysely';
import { Database, MatchStatus, NotificationType, MatchResultStatus, LeagueMemberRole, UserRole } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';
import { CreateMatchResultSubmissionBody, UpdateMatchResultSubmissionBody, ConflictResponse } from './match-results.types';

export class MatchResultsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Check if user is a team member of the specified team
   */
  async isTeamMember(userId: string, teamId: string): Promise<boolean> {
    try {
      const teamMember = await this.db.selectFrom('team_members')
        .select('id')
        .where('user_id', '=', userId)
        .where('team_id', '=', teamId)
        .where('status', '=', 'active')
        .executeTakeFirst();
      
      return !!teamMember;
    } catch (error) {
      throw new Error(`Failed to check team membership: ${error}`);
    }
  }

  /**
   * Check if user is a manager of the specified league
   */
  async isLeagueManager(userId: string, leagueId: string): Promise<boolean> {
    try {
      // First check if user is an admin (admins have league manager privileges)
      const adminUser = await this.db.selectFrom('users')
        .select('id')
        .where('id', '=', userId)
        .where('role', '=', 'admin' as UserRole)
        .executeTakeFirst();
      
      if (adminUser) {
        return true; // Admin users have league manager privileges
      }
      
      // Otherwise check if they're explicitly assigned as a league manager
      const leagueMember = await this.db.selectFrom('league_members')
        .select('id')
        .where('user_id', '=', userId)
        .where('league_id', '=', leagueId)
        .where('role', '=', 'manager' as LeagueMemberRole)
        .executeTakeFirst();
      
      return !!leagueMember;
    } catch (error) {
      throw new Error(`Failed to check league manager role: ${error}`);
    }
  }

  /**
   * Get match details including league ID and team IDs
   */
  async getMatchDetails(matchId: string) {
    try {
      return await this.db.selectFrom('matches')
        .leftJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
        .leftJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
        .select([
          'matches.id',
          'matches.league_id',
          'matches.home_team_id',
          'matches.away_team_id',
          'matches.status',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name'
        ])
        .where('matches.id', '=', matchId)
        .executeTakeFirst();
    } catch (error) {
      throw new Error(`Failed to get match details: ${error}`);
    }
  }

  /**
   * Get list of league managers
   */
  async getLeagueManagers(leagueId: string) {
    try {
      return await this.db.selectFrom('league_members')
        .innerJoin('users', 'users.id', 'league_members.user_id')
        .select([
          'users.id as user_id',
          'users.username'
        ])
        .where('league_members.league_id', '=', leagueId)
        .where('league_members.role', '=', 'manager' as LeagueMemberRole)
        .execute();
    } catch (error) {
      throw new Error(`Failed to get league managers: ${error}`);
    }
  }

  /**
   * Get all match result submissions for a specific match
   */
  async getMatchResultSubmissions(matchId: string) {
    try {
      return await this.db.selectFrom('match_result_submissions')
        .innerJoin('teams', 'teams.id', 'match_result_submissions.team_id')
        .innerJoin('users', 'users.id', 'match_result_submissions.user_id')
        .select([
          'match_result_submissions.id',
          'match_result_submissions.match_id',
          'match_result_submissions.team_id',
          'teams.name as team_name',
          'match_result_submissions.user_id',
          'users.username',
          'match_result_submissions.home_team_score',
          'match_result_submissions.away_team_score',
          'match_result_submissions.notes',
          'match_result_submissions.status',
          'match_result_submissions.created_at',
          'match_result_submissions.updated_at'
        ])
        .where('match_result_submissions.match_id', '=', matchId)
        .execute();
    } catch (error) {
      throw new Error(`Failed to get match result submissions: ${error}`);
    }
  }

  /**
   * Check if there is an existing submission for the team
   */
  async getTeamSubmission(matchId: string, teamId: string) {
    try {
      return await this.db.selectFrom('match_result_submissions')
        .select([
          'id',
          'user_id',
          'home_team_score',
          'away_team_score',
          'notes',
          'status'
        ])
        .where('match_id', '=', matchId)
        .where('team_id', '=', teamId)
        .executeTakeFirst();
    } catch (error) {
      throw new Error(`Failed to check existing submission: ${error}`);
    }
  }

  /**
   * Submit match result
   */
  async submitMatchResult(userId: string, data: CreateMatchResultSubmissionBody) {
    try {
      // Get match details
      const match = await this.getMatchDetails(data.match_id);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status === 'completed') {
        throw new Error('Cannot submit result for a completed match');
      }

      // Determine which team the user belongs to
      let userTeamId = null;
      if (await this.isTeamMember(userId, match.home_team_id)) {
        userTeamId = match.home_team_id;
      } else if (await this.isTeamMember(userId, match.away_team_id)) {
        userTeamId = match.away_team_id;
      } else if (await this.isLeagueManager(userId, match.league_id)) {
        // If user is a league manager, they can submit directly
        // We'll update the match score directly in this case
        await this.db.updateTable('matches')
          .set({
            home_team_score: data.home_team_score,
            away_team_score: data.away_team_score,
            status: 'completed'
          })
          .where('id', '=', data.match_id)
          .execute();

        return {
          submission: null,
          matchUpdated: true,
          message: 'Match score updated by league manager'
        };
      } else {
        throw new Error('User is not a member of either team in this match');
      }

      // Check if team already has a submission
      const existingSubmission = await this.getTeamSubmission(data.match_id, userTeamId);
      if (existingSubmission) {
        throw new Error('Team has already submitted a result for this match');
      }

      // Create submission
      const result = await this.db.insertInto('match_result_submissions')
        .values({
          id: uuidv4(),
          match_id: data.match_id,
          team_id: userTeamId,
          user_id: userId,
          home_team_score: data.home_team_score,
          away_team_score: data.away_team_score,
          notes: data.notes,
          status: 'pending' as MatchResultStatus
        })
        .returning(['id', 'match_id', 'team_id', 'user_id', 'home_team_score', 'away_team_score', 'notes', 'status', 'created_at', 'updated_at'])
        .executeTakeFirst();

      // Check if both teams have submitted results
      const submissions = await this.getMatchResultSubmissions(data.match_id);
      if (submissions.length === 2) {
        // Compare the submissions
        const team1Sub = submissions[0];
        const team2Sub = submissions[1];
        
        // If scores match, update the match and set submissions to approved
        if (
          team1Sub.home_team_score === team2Sub.home_team_score &&
          team1Sub.away_team_score === team2Sub.away_team_score
        ) {
          // Update match with agreed scores
          await this.db.updateTable('matches')
            .set({
              home_team_score: team1Sub.home_team_score,
              away_team_score: team1Sub.away_team_score,
              status: 'completed'
            })
            .where('id', '=', data.match_id)
            .execute();
          
          // Approve both submissions
          await this.db.updateTable('match_result_submissions')
            .set({ status: 'approved' as MatchResultStatus })
            .where('match_id', '=', data.match_id)
            .execute();
          
          return {
            submission: result,
            matchUpdated: true,
            message: 'Match results matched and have been recorded'
          };
        } else {
          // Scores don't match, notify league managers
          const managers = await this.getLeagueManagers(match.league_id);
          
          // Create conflict response
          const conflictData: ConflictResponse = {
            conflict: true,
            team1_submission: {
              team_id: team1Sub.team_id,
              team_name: team1Sub.team_name,
              home_team_score: team1Sub.home_team_score,
              away_team_score: team1Sub.away_team_score
            },
            team2_submission: {
              team_id: team2Sub.team_id,
              team_name: team2Sub.team_name,
              home_team_score: team2Sub.home_team_score,
              away_team_score: team2Sub.away_team_score
            }
          };
          
          // Create notifications for league managers
          for (const manager of managers) {
            await this.db.insertInto('notifications')
              .values({
                id: uuidv4(),
                user_id: manager.user_id,
                title: 'Match Result Conflict',
                body: `There is a score discrepancy for match between ${match.home_team_name} and ${match.away_team_name}. Please review and resolve.`,
                type: 'match_result' as NotificationType,
                action_id: data.match_id,
                is_read: false
              })
              .execute();
          }
          
          return {
            submission: result,
            matchUpdated: false,
            message: 'Score discrepancy detected, league managers have been notified',
            conflict: conflictData
          };
        }
      }
      
      return {
        submission: result,
        matchUpdated: false,
        message: 'Match result submitted, waiting for opponent submission'
      };
    } catch (error) {
      throw new Error(`Failed to submit match result: ${error}`);
    }
  }

  /**
   * Get a specific match result submission
   */
  async getSubmissionById(id: string) {
    try {
      return await this.db.selectFrom('match_result_submissions')
        .innerJoin('teams', 'teams.id', 'match_result_submissions.team_id')
        .innerJoin('users', 'users.id', 'match_result_submissions.user_id')
        .select([
          'match_result_submissions.id',
          'match_result_submissions.match_id',
          'match_result_submissions.team_id',
          'teams.name as team_name',
          'match_result_submissions.user_id',
          'users.username',
          'match_result_submissions.home_team_score',
          'match_result_submissions.away_team_score',
          'match_result_submissions.notes',
          'match_result_submissions.status',
          'match_result_submissions.created_at',
          'match_result_submissions.updated_at'
        ])
        .where('match_result_submissions.id', '=', id)
        .executeTakeFirst();
    } catch (error) {
      throw new Error(`Failed to get submission: ${error}`);
    }
  }

  /**
   * Update match result submission status (for managers)
   */
  async updateSubmissionStatus(id: string, data: UpdateMatchResultSubmissionBody) {
    try {
      // Get submission with match details
      const submission = await this.db.selectFrom('match_result_submissions')
        .innerJoin('matches', 'matches.id', 'match_result_submissions.match_id')
        .select([
          'match_result_submissions.id',
          'match_result_submissions.match_id',
          'match_result_submissions.team_id', 
          'match_result_submissions.home_team_score',
          'match_result_submissions.away_team_score',
          'matches.status as match_status'
        ])
        .where('match_result_submissions.id', '=', id)
        .executeTakeFirst();
      
      if (!submission) {
        throw new Error('Submission not found');
      }

      // If approving a submission, update the match
      if (data.status === 'approved' && submission.match_status !== 'completed') {
        await this.db.updateTable('matches')
          .set({
            home_team_score: submission.home_team_score,
            away_team_score: submission.away_team_score,
            status: 'completed'
          })
          .where('id', '=', submission.match_id)
          .execute();
      }

      // Update submission status
      return await this.db.updateTable('match_result_submissions')
        .set({
          status: data.status as MatchResultStatus,
          notes: data.notes
        })
        .where('id', '=', id)
        .returning(['id', 'match_id', 'team_id', 'user_id', 'home_team_score', 'away_team_score', 'notes', 'status', 'created_at', 'updated_at'])
        .executeTakeFirst();
    } catch (error) {
      throw new Error(`Failed to update submission: ${error}`);
    }
  }

  /**
   * Delete a match result submission
   */
  async deleteSubmission(id: string): Promise<boolean> {
    try {
      const result = await this.db.deleteFrom('match_result_submissions')
        .where('id', '=', id)
        .executeTakeFirst();
      
      return !!result && result.numDeletedRows > BigInt(0);
    } catch (error) {
      throw new Error(`Failed to delete submission: ${error}`);
    }
  }
} 