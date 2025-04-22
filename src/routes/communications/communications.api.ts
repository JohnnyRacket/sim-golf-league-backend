import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  createCommunication, 
  getCommunications, 
  getCommunicationById, 
  deleteCommunication, 
  getCommunicationsForLeague
} from './communications.service';
import { 
  communicationSchema,
  communicationListSchema,
  createCommunicationSchema,
  communicationIdParamsSchema,
  leagueIdParamsSchema,
  errorResponseSchema,
  successResponseSchema,
  CreateCommunicationBody
} from './communications.types';

export async function communicationRoutes(fastify: FastifyInstance) {
  // Get all communications
  fastify.get('/', {
    schema: {
      response: {
        200: communicationListSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply: FastifyReply) => {
    try {
      const communications = await getCommunications();
      return communications;
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get communication by ID
  fastify.get('/:id', {
    schema: {
      params: communicationIdParamsSchema,
      response: {
        200: communicationSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const communication = await getCommunicationById(id);
      return communication;
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all communications for a specific league
  fastify.get('/league/:leagueId', {
    schema: {
      params: leagueIdParamsSchema,
      response: {
        200: communicationListSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { leagueId: string } }>, reply: FastifyReply) => {
    try {
      const { leagueId } = request.params;
      const communications = await getCommunicationsForLeague(leagueId);
      return communications;
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create a new communication
  fastify.post('/', {
    schema: {
      body: createCommunicationSchema,
      response: {
        200: communicationSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateCommunicationBody }>, reply: FastifyReply) => {
    try {
      const { 
        recipientType, 
        recipientId, 
        type, 
        title, 
        message, 
        expirationDate, 
        senderId 
      } = request.body;

      // Only use current user's ID if sender is not specified explicitly as null
      const actualSenderId = senderId === null ? null : (senderId || request.user.id.toString());
      
      const newCommunication = await createCommunication({
        recipientType: recipientType as 'league' | 'team' | 'user',
        recipientId,
        type: type as 'system' | 'league' | 'maintenance' | 'advertisement' | 'schedule',
        title,
        message,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        senderId: actualSenderId
      });
      
      return newCommunication;
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete communication
  fastify.delete('/:id', {
    schema: {
      params: communicationIdParamsSchema,
      response: {
        200: successResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const result = await deleteCommunication(id);
      return result;
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 