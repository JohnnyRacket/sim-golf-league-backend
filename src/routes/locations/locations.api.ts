import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import { checkRole } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

// Schema definitions
const locationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' }
  },
  required: ['name', 'address']
} as const;

const createLocationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zip: { type: 'string' },
    country: { type: 'string' }
  },
  required: ['name', 'address']
};

const updateLocationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' }
  }
} as const;

interface CreateLocationBody {
  name: string;
  address: string;
}

interface UpdateLocationBody {
  name?: string;
  address?: string;
}

export async function locationRoutes(fastify: FastifyInstance) {
  // Get all locations
  fastify.get('/', async (request, reply) => {
    try {
      const locations = await db.selectFrom('locations')
        .selectAll()
        .execute();
      
      return locations;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get location by ID
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const location = await db.selectFrom('locations')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      
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
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { name, address } = request.body;
      
      // Find a manager for this admin user
      const manager = await db.selectFrom('managers')
        .select('id')
        .where('user_id', '=', request.user.id.toString())
        .executeTakeFirst();
      
      if (!manager) {
        // Create a manager record if it doesn't exist
        const managerId = uuidv4();
        
        await db.insertInto('managers')
          .values({
            id: managerId,
            user_id: request.user.id.toString(),
            name: `Manager for ${request.user.username}`
          })
          .execute();
          
        // Generate location ID
        const locationId = uuidv4();
        
        // Create the location
        await db.insertInto('locations')
          .values({
            id: locationId,
            manager_id: managerId,
            name,
            address
          })
          .execute();
        
        reply.code(201).send({
          message: 'Location created successfully',
          id: locationId
        });
      } else {
        // Generate location ID
        const locationId = uuidv4();
        
        // Create the location
        await db.insertInto('locations')
          .values({
            id: locationId,
            manager_id: manager.id,
            name,
            address
          })
          .execute();
        
        reply.code(201).send({
          message: 'Location created successfully',
          id: locationId
        });
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update location
  fastify.put<{ Params: { id: string }; Body: UpdateLocationBody }>('/:id', {
    preHandler: checkRole(['admin']),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: updateLocationSchema
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      // Check if location exists and admin has access
      const location = await db.selectFrom('locations')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select(['locations.id', 'managers.user_id'])
        .where('locations.id', '=', id)
        .executeTakeFirst();
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      // Only the location's manager can update it
      if (location.user_id.toString() !== request.user.id.toString() && !request.user.roles.includes('admin')) {
        reply.code(403).send({ error: 'You are not authorized to update this location' });
        return;
      }
      
      // Update location
      await db.updateTable('locations')
        .set(updateData)
        .where('id', '=', id)
        .execute();
      
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
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Check if location exists
      const location = await db.selectFrom('locations')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select(['locations.id', 'managers.user_id'])
        .where('locations.id', '=', id)
        .executeTakeFirst();
      
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      
      // Only the location's manager can delete it
      if (location.user_id.toString() !== request.user.id.toString() && !request.user.roles.includes('admin')) {
        reply.code(403).send({ error: 'You are not authorized to delete this location' });
        return;
      }
      
      // Check if there are leagues associated with this location
      const leagues = await db.selectFrom('leagues')
        .select('id')
        .where('location_id', '=', id)
        .execute();
      
      if (leagues.length > 0) {
        reply.code(400).send({ error: 'Cannot delete location with associated leagues' });
        return;
      }
      
      // Delete location
      await db.deleteFrom('locations')
        .where('id', '=', id)
        .execute();
      
      reply.send({ message: 'Location deleted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 