import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { MatchResultsService } from './match-results.service';
import {
  matchResultSubmissionSchema,
  matchResultSubmissionListSchema,
  createMatchResultSubmissionSchema,
  updateMatchResultSubmissionSchema,
  errorResponseSchema,
  successMessageSchema,
  matchIdParamsSchema,
  submissionIdParamsSchema,
  conflictResponseSchema,
  CreateMatchResultSubmissionBody,
  UpdateMatchResultSubmissionBody,
  MatchIdParams,
  SubmissionIdParams
} from './match-results.types';

export async function matchResultRoutes(fastify: FastifyInstance) {
  // Initialize service
  const matchResultsService = new MatchResultsService(db);

  // Get all match result submissions for a specific match
  fastify.get<{ Params: MatchIdParams }>('/match/:match_id', {
    schema: {
      params: matchIdParamsSchema,
      response: {
        200: matchResultSubmissionListSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { match_id } = request.params;
      
      // Get match details to check permissions
      const match = await matchResultsService.getMatchDetails(match_id);
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Check if user is allowed to view these submissions
      const userId = request.user.id.toString();
      const isHomeTeamMember = await matchResultsService.isTeamMember(userId, match.home_team_id);
      const isAwayTeamMember = await matchResultsService.isTeamMember(userId, match.away_team_id);
      const isLeagueManager = await matchResultsService.isLeagueManager(userId, match.league_id);
      
      if (!isHomeTeamMember && !isAwayTeamMember && !isLeagueManager) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }
      
      const submissions = await matchResultsService.getMatchResultSubmissions(match_id);
      return submissions;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get a specific match result submission
  fastify.get<{ Params: SubmissionIdParams }>('/:id', {
    schema: {
      params: submissionIdParamsSchema,
      response: {
        200: matchResultSubmissionSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const submission = await matchResultsService.getSubmissionById(id);
      
      if (!submission) {
        reply.code(404).send({ error: 'Submission not found' });
        return;
      }
      
      // Get match details to check permissions
      const match = await matchResultsService.getMatchDetails(submission.match_id);
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Check if user is allowed to view this submission
      const userId = request.user.id.toString();
      const isHomeTeamMember = await matchResultsService.isTeamMember(userId, match.home_team_id);
      const isAwayTeamMember = await matchResultsService.isTeamMember(userId, match.away_team_id);
      const isLeagueManager = await matchResultsService.isLeagueManager(userId, match.league_id);
      
      if (!isHomeTeamMember && !isAwayTeamMember && !isLeagueManager) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }
      
      return submission;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Submit match result
  fastify.post('/', {
    schema: {
      body: createMatchResultSubmissionSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            submission: {
              type: ['object', 'null'],
              properties: matchResultSubmissionSchema.properties
            },
            matchUpdated: { type: 'boolean' },
            message: { type: 'string' },
            conflict: {
              type: ['object', 'null'],
              properties: conflictResponseSchema.properties
            }
          }
        },
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateMatchResultSubmissionBody }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id.toString();
      const data = request.body;
      
      // Submit match result
      const result = await matchResultsService.submitMatchResult(userId, data);
      
      return result;
    } catch (error) {
      request.log.error(error);
      
      // Handle specific error cases
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Match not found')) {
        reply.code(404).send({ error: errorMessage });
        return;
      } else if (errorMessage.includes('not a member')) {
        reply.code(403).send({ error: errorMessage });
        return;
      } else if (errorMessage.includes('already submitted')) {
        reply.code(409).send({ error: errorMessage });
        return;
      } else if (errorMessage.includes('completed match')) {
        reply.code(400).send({ error: errorMessage });
        return;
      }
      
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update match result submission status (for managers)
  fastify.patch<{ Params: SubmissionIdParams; Body: UpdateMatchResultSubmissionBody }>('/:id', {
    schema: {
      params: submissionIdParamsSchema,
      body: updateMatchResultSubmissionSchema,
      response: {
        200: matchResultSubmissionSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      const data = request.body;
      
      // Get submission first to check permissions
      const submission = await matchResultsService.getSubmissionById(id);
      if (!submission) {
        reply.code(404).send({ error: 'Submission not found' });
        return;
      }
      
      // Get match details to check permissions
      const match = await matchResultsService.getMatchDetails(submission.match_id);
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Only league managers can update submission status
      const isLeagueManager = await matchResultsService.isLeagueManager(userId, match.league_id);
      if (!isLeagueManager) {
        reply.code(403).send({ error: 'Only league managers can update submission status' });
        return;
      }
      
      const updated = await matchResultsService.updateSubmissionStatus(id, data);
      return updated;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a match result submission
  fastify.delete<{ Params: SubmissionIdParams }>('/:id', {
    schema: {
      params: submissionIdParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      
      // Get submission first to check permissions
      const submission = await matchResultsService.getSubmissionById(id);
      if (!submission) {
        reply.code(404).send({ error: 'Submission not found' });
        return;
      }
      
      // Get match details to check permissions
      const match = await matchResultsService.getMatchDetails(submission.match_id);
      if (!match) {
        reply.code(404).send({ error: 'Match not found' });
        return;
      }
      
      // Check if user is allowed to delete this submission
      const isLeagueManager = await matchResultsService.isLeagueManager(userId, match.league_id);
      const isSubmitter = submission.user_id === userId;
      
      if (!isLeagueManager && !isSubmitter) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }
      
      const deleted = await matchResultsService.deleteSubmission(id);
      
      if (!deleted) {
        reply.code(500).send({ error: 'Failed to delete submission' });
        return;
      }
      
      return { message: 'Match result submission deleted successfully' };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 