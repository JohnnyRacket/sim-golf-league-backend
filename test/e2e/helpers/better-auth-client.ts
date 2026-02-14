import { ApiClient } from './api-client';

/**
 * Better-auth specific authentication helper for E2E tests
 */
export class BetterAuthClient {
  constructor(private api: ApiClient) {}

  /**
   * Sign in via better-auth and obtain JWT token
   */
  async signIn(email: string, password: string): Promise<string> {
    // 1. Sign in to create stateless session cookie
    const signInResponse = await this.api.post('/api/auth/sign-in/email', {
      email,
      password,
    });

    if (signInResponse.status !== 200) {
      throw new Error(`Better-auth sign-in failed: ${signInResponse.status}`);
    }

    // 2. Get JWT token using better-auth JWT plugin
    const tokenResponse = await this.api.get('/api/auth/token');

    if (tokenResponse.status !== 200 || !tokenResponse.data?.token) {
      throw new Error('Failed to get JWT from better-auth');
    }

    return tokenResponse.data.token;
  }

  /**
   * Register new user via better-auth
   */
  async signUp(username: string, email: string, password: string): Promise<string> {
    const signUpResponse = await this.api.post('/api/auth/sign-up/email', {
      name: username, // better-auth maps 'name' to 'username' in config
      email,
      password,
    });

    if (signUpResponse.status !== 200) {
      throw new Error(`Better-auth sign-up failed: ${signUpResponse.status}`);
    }

    // Get JWT token
    const tokenResponse = await this.api.get('/api/auth/token');
    return tokenResponse.data.token;
  }
}
