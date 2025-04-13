import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import jwt from '@fastify/jwt';
import { registerRoutes } from './routes';

export async function createServer() {
  const server = fastify({
    logger: true
  });

  // Register plugins
  server.register(cors, {
    origin: true
  });

  server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production'
  });

  server.register(swagger, {
    swagger: {
      info: {
        title: 'Golf Simulation League API',
        description: 'API for managing golf simulation leagues',
        version: '1.0.0'
      },
      host: 'localhost',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    }
  });

  // Register all routes
  server.register(registerRoutes);

  return server;
}

// Start the server if this file is run directly
if (require.main === module) {
  const start = async () => {
    try {
      const server = await createServer();
      await server.listen({ port: 3000, host: '0.0.0.0' });
      console.log('Server is running on http://localhost:3000');
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  start();
} 