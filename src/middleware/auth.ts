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
      // Get the user from the JWT token
      const user = request.user;
      
      // Check if the user has at least one of the required roles
      let hasRole = false;
      
      if (user.roles && Array.isArray(user.roles)) {
        // Convert all roles to strings for comparison
        const userRoles = user.roles.map(role => String(role));
        hasRole = roles.some(role => userRoles.includes(role));
      }
      
      if (!hasRole) {
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
} 