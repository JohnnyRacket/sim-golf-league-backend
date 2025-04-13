import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { LoginCredentials, RegisterData } from '../types/auth';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../types/database';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: LoginCredentials }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    try {
      const user = await db.selectFrom('users')
        .select(['id', 'username', 'email', 'password_hash'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }

      // Check if user is a manager
      const manager = await db.selectFrom('managers')
        .select('id')
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      const roles = ['user'];
      if (manager) {
        roles.push('manager');
      }

      const token = await reply.jwtSign({
        id: user.id,
        username: user.username,
        email: user.email,
        roles
      });

      return { token };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post<{ Body: RegisterData }>('/register', async (request, reply) => {
    const { username, email, password } = request.body;

    try {
      // Check if user already exists
      const existingUser = await db.selectFrom('users')
        .select('id')
        .where(eb => eb.or([
          eb('email', '=', email),
          eb('username', '=', username)
        ]))
        .executeTakeFirst();

      if (existingUser) {
        reply.code(400).send({ error: 'User already exists' });
        return;
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user with UUID
      const userId = uuidv4();
      await db.insertInto('users')
        .values({
          id: userId,
          username,
          email,
          password_hash: passwordHash,
          role: 'user' as UserRole
        })
        .execute();

      const token = await reply.jwtSign({
        id: userId,
        username,
        email,
        roles: ['user']
      });

      return { token };
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 