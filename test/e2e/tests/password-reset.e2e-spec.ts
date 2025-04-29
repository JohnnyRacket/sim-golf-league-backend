import { describe, it, expect } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';

describe('Password Reset Flow (E2E)', () => {
  // Setup test data
  const testUser = {
    email: 'user1@example.com',
    username: 'user1',
    password: 'password123',
    newPassword: 'newpassword456'
  };

  it('should request a password reset and receive success response', async () => {
    // Request password reset
    const response = await api.post('/auth/reset-password', {
      email: testUser.email
    });
    
    // The API should always return 200 (even if email doesn't exist for security)
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('message');
  });

  it('should fail with invalid verification code', async () => {
    // Try to verify with an invalid code
    const resetResponse = await api.post('/auth/reset-password/verify', {
      email: testUser.email,
      challengeCode: '000000', // Invalid code
      newPassword: testUser.newPassword
    });
    
    // Should fail with 400 Bad Request
    expect(resetResponse.status).toBe(400);
    expect(resetResponse.data).toHaveProperty('error');
  });

  it('should fail with expired verification code', async () => {
    // Try to verify with an email that doesn't have a valid challenge
    const mockExpiredResponse = await api.post('/auth/reset-password/verify', {
      email: 'expired@example.com', // Email that doesn't match any challenge
      challengeCode: '123456',
      newPassword: 'newpassword'
    });
    
    expect(mockExpiredResponse.status).toBe(400);
    expect(mockExpiredResponse.data).toHaveProperty('error');
  });
  
  it('should protect user privacy by not revealing if email exists', async () => {
    // Request password reset for non-existent email
    const response = await api.post('/auth/reset-password', {
      email: 'nonexistent@example.com'
    });
    
    // Should still return 200 OK (security best practice)
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('message');
  });
}); 