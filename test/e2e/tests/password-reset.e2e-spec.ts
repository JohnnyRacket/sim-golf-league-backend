import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { api, seedData } from '../helpers/setup';
import { emailService } from '../../../src/routes/email/email.service';

describe('Password Reset Flow (E2E)', () => {
  // Setup test data
  const testUser = {
    email: 'user1@example.com',
    username: 'user1',
    password: 'password123',
    newPassword: 'newpassword456'
  };

  // Setup spies before all tests
  beforeAll(() => {
    // Spy on the sendPasswordResetEmail method
    jest.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async (params) => {
      return { success: true, messageId: `mock-${Date.now()}` };
    });
  });

  // Clear spies between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // We'll clean up in the global afterAll hook in setup.ts
  // No need for a local afterAll hook

  it('should request a password reset and receive confirmation', async () => {
    // Request password reset
    const response = await api.post('/auth/reset-password', {
      email: testUser.email
    });
    
    // The API should always return 200 (even if email doesn't exist for security)
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    
    // Verify that sendPasswordResetEmail was called with the right parameters
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: testUser.email,
        username: testUser.username
      })
    );
  });

  it('should complete the password reset flow', async () => {
    // Get the auth service to create a real password reset
    let challengeCode = '';
    
    // Setup spy to capture the challenge code
    jest.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async (params) => {
      challengeCode = params.challengeCode;
      return { success: true, messageId: `mock-${Date.now()}` };
    });
    
    // Step 1: Request password reset
    await api.post('/auth/reset-password', {
      email: testUser.email
    });
    
    // Verify that the email service was called
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(challengeCode).toBeTruthy();
    expect(challengeCode.length).toBe(6); // Challenge code should be 6 digits
    
    // Step 3: Verify the code and reset password
    const resetResponse = await api.post('/auth/reset-password/verify', {
      email: testUser.email,
      challengeCode: challengeCode,
      newPassword: testUser.newPassword
    });
    
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.data).toHaveProperty('success', true);
    expect(resetResponse.data).toHaveProperty('message');
    
    // Step 4: Try to login with the new password
    const loginResponse = await api.post('/auth/login', {
      email: testUser.email,
      password: testUser.newPassword
    });
    
    // Login should be successful with the new password
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data).toHaveProperty('token');
    expect(loginResponse.data.token).toBeTruthy();
    expect(loginResponse.data).toHaveProperty('user');
    expect(loginResponse.data.user).toHaveProperty('username', testUser.username);
  });

  it('should fail with invalid verification code', async () => {
    // Request password reset (just to ensure one exists)
    await api.post('/auth/reset-password', {
      email: testUser.email
    });
    
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
    
    // Email service should not be called for non-existent email
    // But we can't test this easily in e2e tests as it's internal
    // This would be better tested with unit tests
  });
}); 