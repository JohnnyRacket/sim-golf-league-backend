import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { registerRoutes } from './routes';
import { config } from './utils/config';

export async function createServer() {
  const server = fastify({
    logger: true
  });

  // Register plugins
  server.register(cors, {
    origin: config.corsOrigins
  });

  server.register(jwt, {
    secret: config.jwtSecret
  });

  // Global rate limit: 100 requests per minute per IP
  server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Register Swagger
  server.register(swagger, {
    openapi: {
      info: {
        title: 'Golf Simulation League API',
        description: 'API for managing golf simulation leagues',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  // Register Swagger UI
  server.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true
  });

  // Health check endpoint (no auth required)
  server.get('/health', async () => {
    return { status: 'ok' };
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
      const port = config.port;
      await server.listen({ port, host: '0.0.0.0' });
      console.log(`Server is running on http://localhost:${port}`);
      console.log(`API Documentation available at http://localhost:${port}/docs`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  start();
} 