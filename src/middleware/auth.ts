import { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function checkRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      const hasRole = roles.some(role => user.roles.includes(role));
      
      if (!hasRole) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
} 