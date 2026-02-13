import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { NotFoundError } from '../../utils/errors';
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
    const { match_id } = request.params;

    // Get match details to check permissions
    const match = await matchResultsService.getMatchDetails(match_id);
    if (!match) {
      throw new NotFoundError('Match');
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

    return matchResultsService.getMatchResultSubmissions(match_id);
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
    const { id } = request.params;
    const submission = await matchResultsService.getSubmissionById(id);

    if (!submission) {
      throw new NotFoundError('Submission');
    }

    // Get match details to check permissions
    const match = await matchResultsService.getMatchDetails(submission.match_id);
    if (!match) {
      throw new NotFoundError('Match');
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
    const userId = request.user.id.toString();
    const data = request.body;

    // Submit match result - errors propagate to centralized handler
    return matchResultsService.submitMatchResult(userId, data);
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
    const { id } = request.params;
    const userId = request.user.id.toString();
    const data = request.body;

    // Get submission first to check permissions
    const submission = await matchResultsService.getSubmissionById(id);
    if (!submission) {
      throw new NotFoundError('Submission');
    }

    // Get match details to check permissions
    const match = await matchResultsService.getMatchDetails(submission.match_id);
    if (!match) {
      throw new NotFoundError('Match');
    }

    // Only league managers can update submission status
    const isLeagueManager = await matchResultsService.isLeagueManager(userId, match.league_id);
    if (!isLeagueManager) {
      reply.code(403).send({ error: 'Only league managers can update submission status' });
      return;
    }

    return matchResultsService.updateSubmissionStatus(id, data);
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
    const { id } = request.params;
    const userId = request.user.id.toString();

    // Get submission first to check permissions
    const submission = await matchResultsService.getSubmissionById(id);
    if (!submission) {
      throw new NotFoundError('Submission');
    }

    // Get match details to check permissions
    const match = await matchResultsService.getMatchDetails(submission.match_id);
    if (!match) {
      throw new NotFoundError('Match');
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
      throw new NotFoundError('Submission');
    }

    return { message: 'Match result submission deleted successfully' };
  });
}