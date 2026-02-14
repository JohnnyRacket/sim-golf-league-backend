import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';

describe('Authentication Flow (E2E)', () => {
  it('should return 401 for protected routes without authentication', async () => {
    const response = await api.get('/leagues');
    expect(response.status).toBe(401);
  });

  it('should fail with invalid credentials', async () => {
    const response = await api.login('nonexistent@example.com', 'wrongpassword');

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
    const loginResponse = await api.login('user1@example.com', 'password123');

    // Check if we got a valid response with token
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data).toHaveProperty('token');
    expect(typeof loginResponse.data.token).toBe('string');
    expect(loginResponse.data.token.length).toBeGreaterThan(10);

    console.log('Token received:', loginResponse.data.token ? 'Yes (length: ' + loginResponse.data.token.length + ')' : 'No');

    // Token is already set by api.login()

    // Try accessing a protected route
    const response = await api.get('/leagues/my');

    console.log('Protected route response status:', response.status);
    if (response.status !== 200) {
      console.log('Response error:', response.data);
    }

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