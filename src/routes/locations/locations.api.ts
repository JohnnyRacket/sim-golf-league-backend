import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { LocationsService, BayBasic } from './locations.service';
import {
  CreateLocationBody,
  UpdateLocationBody,
  createLocationSchema,
  updateLocationSchema,
  locationParamsSchema,
  errorResponseSchema,
  successMessageSchema,
  locationSchema,
  locationDetailSchema,
  // Bay related schemas
  CreateBayBody,
  UpdateBayBody,
  createBaySchema,
  updateBaySchema,
  baySchema,
  bayParamsSchema
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

  // Get all bays for a location
  fastify.get('/:id/bays', {
    schema: {
      params: locationParamsSchema,
      response: {
        200: {
          type: 'array',
          items: baySchema
        },
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      // Check if location exists
      const location = await locationsService.getLocationById(id);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      const bays = await locationsService.getBaysByLocation(id);
      return bays;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get bay by ID
  fastify.get('/:locationId/bays/:bayId', {
    schema: {
      params: bayParamsSchema,
      response: {
        200: baySchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { locationId: string; bayId: string } }>, reply: FastifyReply) => {
    try {
      const { locationId, bayId } = request.params;
      
      // Check if location exists
      const location = await locationsService.getLocationById(locationId);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      const bay = await locationsService.getBayById(bayId);
      
      if (!bay || bay.location_id !== locationId) {
        reply.code(404).send({ error: 'Bay not found' });
        return;
      }
      
      return bay;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create a new bay for a location
  fastify.post<{ Params: { id: string }; Body: CreateBayBody }>('/:id/bays', {
    preHandler: checkRole(['admin']),
    schema: {
      params: locationParamsSchema,
      body: createBaySchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        },
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const bayData = request.body;
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
        reply.code(403).send({ error: 'You are not authorized to add bays to this location' });
        return;
      }
      
      // Create bay
      const bay = await locationsService.createBay(id, bayData);
      
      reply.code(201).send({
        message: 'Bay created successfully',
        id: bay.id
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update a bay
  fastify.put<{ Params: { locationId: string; bayId: string }; Body: UpdateBayBody }>('/:locationId/bays/:bayId', {
    preHandler: checkRole(['admin']),
    schema: {
      params: bayParamsSchema,
      body: updateBaySchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId, bayId } = request.params;
      const updateData = request.body;
      const userId = request.user.id.toString();
      
      // Check if location exists
      const location = await locationsService.getLocationById(locationId);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      // Check if bay exists and belongs to this location
      const bay = await locationsService.getBayById(bayId);
      
      if (!bay || bay.location_id !== locationId) {
        reply.code(404).send({ error: 'Bay not found' });
        return;
      }
      
      // Check if user is authorized
      const isOwner = await locationsService.isUserLocationOwner(locationId, userId);
      
      if (!isOwner && !request.user.roles.includes('admin')) {
        reply.code(403).send({ error: 'You are not authorized to update bays for this location' });
        return;
      }
      
      // Update bay
      await locationsService.updateBay(bayId, updateData);
      
      reply.send({ message: 'Bay updated successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a bay
  fastify.delete<{ Params: { locationId: string; bayId: string } }>('/:locationId/bays/:bayId', {
    preHandler: checkRole(['admin']),
    schema: {
      params: bayParamsSchema,
      response: {
        200: successMessageSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId, bayId } = request.params;
      const userId = request.user.id.toString();
      
      // Check if location exists
      const location = await locationsService.getLocationById(locationId);
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      // Check if bay exists and belongs to this location
      const bay = await locationsService.getBayById(bayId);
      
      if (!bay || bay.location_id !== locationId) {
        reply.code(404).send({ error: 'Bay not found' });
        return;
      }
      
      // Check if user is authorized
      const isOwner = await locationsService.isUserLocationOwner(locationId, userId);
      
      if (!isOwner && !request.user.roles.includes('admin')) {
        reply.code(403).send({ error: 'You are not authorized to delete bays from this location' });
        return;
      }
      
      // Delete bay
      await locationsService.deleteBay(bayId);
      
      reply.send({ message: 'Bay deleted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 