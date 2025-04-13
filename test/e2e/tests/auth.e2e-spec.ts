import { describe, it, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { seedData } from '../helpers/setup';

describe('Authentication Flow (E2E)', () => {
  let api: ApiClient;

  beforeAll(() => {
    api = new ApiClient();
  });

  it('should return 401 for protected routes without authentication', async () => {
    const response = await api.get('/leagues');
    expect(response.status).toBe(401);
  });

  it('should fail with invalid credentials', async () => {
    const response = await api.post('/auth/login', {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    
    expect(response.status).toBe(401);
    expect(response.data).toHaveProperty('error');
  });

  it('should login successfully with valid credentials', async () => {
    const response = await api.login('user1@example.com', 'password123');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    expect(response.data.token).toBeTruthy();
    expect(response.data).toHaveProperty('user');
    expect(response.data.user).toHaveProperty('id');
    expect(response.data.user).toHaveProperty('username', 'user1');
  });

  it('should access protected routes after login', async () => {
    // Login first
    await api.login('user1@example.com', 'password123');
    
    // Try accessing a protected route
    const response = await api.get('/leagues');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should reject with expired/invalid token', async () => {
    // Set an invalid token
    api.setToken('invalid-token');
    
    const response = await api.get('/leagues');
    
    expect(response.status).toBe(401);
  });
}); 