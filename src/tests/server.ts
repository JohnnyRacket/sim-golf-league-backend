import { FastifyInstance } from 'fastify';
import { createServer } from '../index';

export async function createTestServer(): Promise<FastifyInstance> {
  return await createServer();
} 