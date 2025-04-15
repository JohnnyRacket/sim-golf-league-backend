import { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    console.log('Authenticating request - verifying JWT token');
    await request.jwtVerify();
    console.log('JWT verification successful for user:', request.user?.id);
  } catch (err: any) {
    console.error('JWT verification failed:', err.message);
    console.error('Headers:', request.headers.authorization);
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function checkRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get the user from the JWT token
      const user = request.user;
      console.log('Checking roles for user:', user?.id, 'Required roles:', roles);
      
      // Check if the user has at least one of the required roles
      let hasRole = false;
      
      if (user.roles && Array.isArray(user.roles)) {
        // Convert all roles to strings for comparison
        const userRoles = user.roles.map(role => String(role));
        console.log('User roles:', userRoles);
        hasRole = roles.some(role => userRoles.includes(role));
      }
      
      if (!hasRole) {
        console.error('User does not have any of the required roles');
        reply.code(403).send({ error: 'Forbidden' });
        return;
      }
    } catch (err: any) {
      console.error('Error checking roles:', err.message);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
} 