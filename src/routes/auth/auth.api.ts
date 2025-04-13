import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface LoginBody {
  username: string;
  password: string;
}

interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Login route
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { username, password } = request.body;

    try {
      // Find user by username
      const user = await db.selectFrom('users')
        .selectAll()
        .where('username', '=', username)
        .executeTakeFirst();

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return { token };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Register route
  fastify.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { username, email, password } = request.body;

    try {
      // Check if username or email already exists
      const existingUser = await db.selectFrom('users')
        .selectAll()
        .where((eb) => eb.or([
          eb('username', '=', username),
          eb('email', '=', email)
        ]))
        .executeTakeFirst();

      if (existingUser) {
        return reply.status(400).send({ 
          error: 'Username or email already exists' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const result = await db.insertInto('users')
        .values({
          username,
          email,
          password_hash: hashedPassword
        })
        .returning(['id', 'username', 'email'])
        .executeTakeFirst();

      if (!result) {
        throw new Error('Failed to create user');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: result.id,
          username: result.username
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return { token };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
} 