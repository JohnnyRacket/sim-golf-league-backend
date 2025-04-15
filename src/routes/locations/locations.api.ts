import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { LocationsService } from './locations.service';
import {
  CreateLocationBody,
  UpdateLocationBody,
  createLocationSchema,
  updateLocationSchema,
  locationParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  locationSchema,
  locationDetailSchema
} from './locations.types';

export async function locationRoutes(fastify: FastifyInstance) {
  // Initialize locations service
  const locationsService = new LocationsService(db);

  // Get all locations
  fastify.get('/', {
    schema: {
      response: {
        200: { 
          type: 'array',
          items: locationSchema
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const locations = await locationsService.getAllLocations();
      return locations;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get location by ID
  fastify.get('/:id', {
    schema: {
      params: locationParamsSchema,
      response: {
        200: locationDetailSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const location = await locationsService.getLocationById(id);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      return location;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new location (admin only)
  fastify.post<{ Body: CreateLocationBody }>('/', {
    preHandler: checkRole(['admin']),
    schema: {
      body: createLocationSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        },
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { name, address } = request.body;
      const userId = request.user.id.toString();
      const username = request.user.username;
      
      // Create or get owner ID
      const ownerId = await locationsService.createOwnerIfNeeded(
        userId,
        `Owner: ${username}`
      );
      
      // Create the location
      const location = await locationsService.createLocation(ownerId, {
        name,
        address
      });
      
      reply.code(201).send({
        message: 'Location created successfully',
        id: location.id
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update location
  fastify.put<{ Params: { id: string }; Body: UpdateLocationBody }>('/:id', {
    preHandler: checkRole(['admin']),
    schema: {
      params: locationParamsSchema,
      body: updateLocationSchema,
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
      const updateData = request.body;
      const userId = request.user.id.toString();
      
      // Check if location exists
      const location = await locationsService.getLocationById(id);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      // Check if user is authorized
      const isOwner = await locationsService.isUserLocationOwner(id, userId);
      
      if (!isOwner && !request.user.roles.includes('admin')) {
        reply.code(403).send({ error: 'You are not authorized to update this location' });
        return;
      }
      
      // Update location
      await locationsService.updateLocation(id, updateData);
      
      reply.send({ message: 'Location updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete location
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: checkRole(['admin']),
    schema: {
      params: locationParamsSchema,
      response: {
        200: successMessageSchema,
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id.toString();
      
      // Check if location exists
      const location = await locationsService.getLocationById(id);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      // Check if user is authorized
      const isOwner = await locationsService.isUserLocationOwner(id, userId);
      
      if (!isOwner && !request.user.roles.includes('admin')) {
        reply.code(403).send({ error: 'You are not authorized to delete this location' });
        return;
      }
      
      try {
        // Delete location (this will check for leagues)
        await locationsService.deleteLocation(id);
        reply.send({ message: 'Location deleted successfully' });
      } catch (error) {
        if (error instanceof Error && error.message.includes('leagues')) {
          reply.code(400).send({ error: 'Cannot delete location with associated leagues' });
          return;
        }
        throw error;
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 