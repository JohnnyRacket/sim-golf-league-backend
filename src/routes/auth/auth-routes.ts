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
      const user = await db.oneOrNone(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username,
          role: user.role
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
      const existingUser = await db.oneOrNone(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser) {
        return reply.status(400).send({ 
          error: 'Username or email already exists' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await db.one(
        `INSERT INTO users (username, email, password, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id, username, email, role`,
        [username, email, hashedPassword]
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id,
          username: newUser.username,
          role: newUser.role
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