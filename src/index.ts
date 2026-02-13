import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { registerRoutes } from './routes';
import { config } from './utils/config';
import { ApplicationError } from './utils/errors';
import { auth } from './auth';

export async function createServer() {
  const server = fastify({
    logger: true
  });

  // Register plugins
  server.register(cors, {
    origin: config.corsOrigins
  });

  // Global rate limit: 100 requests per minute per IP (disabled in test)
  server.register(rateLimit, config.rateLimit.global);

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

  // Mount better-auth handler for native auth endpoints
  const betterAuthHandler = toNodeHandler(auth);
  server.all('/api/auth/*', async (request, reply) => {
    await betterAuthHandler(request.raw, reply.raw);
  });

  // Centralized error handler
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof ApplicationError) {
      request.log.warn(error);
      return reply.status(error.statusCode).send({ error: error.message });
    }

    // Rate limit errors (429)
    if (error.statusCode === 429) {
      request.log.warn(error);
      return reply.status(429).send({ error: error.message || 'Rate limit exceeded' });
    }

    // Fastify validation errors (schema validation)
    if (error.validation) {
      return reply.status(400).send({ error: error.message });
    }

    // Unexpected errors
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
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
