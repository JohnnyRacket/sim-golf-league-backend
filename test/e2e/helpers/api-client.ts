import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL } from './setup';

/**
 * API client for end-to-end testing
 */
export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL = API_URL) {
    this.client = axios.create({
      baseURL,
      validateStatus: () => true, // Always resolve promises (don't throw on non-2xx)
    });
  }

  /**
   * Set authentication token for subsequent requests
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Get request config with auth token if available
   */
  private getConfig(config: AxiosRequestConfig = {}): AxiosRequestConfig {
    if (this.token) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${this.token}`,
        },
      };
    }
    return config;
  }

  /**
   * Perform login and set token automatically
   */
  async login(email: string, password: string): Promise<any> {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });

    if (response.status === 200 && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * GET request
   */
  async get(path: string, config: AxiosRequestConfig = {}): Promise<any> {
    return this.client.get(path, this.getConfig(config));
  }

  /**
   * POST request
   */
  async post(path: string, data: any, config: AxiosRequestConfig = {}): Promise<any> {
    return this.client.post(path, data, this.getConfig(config));
  }

  /**
   * PUT request
   */
  async put(path: string, data: any, config: AxiosRequestConfig = {}): Promise<any> {
    return this.client.put(path, data, this.getConfig(config));
  }

  /**
   * PATCH request
   */
  async patch(path: string, data: any, config: AxiosRequestConfig = {}): Promise<any> {
    return this.client.patch(path, data, this.getConfig(config));
  }

  /**
   * DELETE request
   */
  async delete(path: string, config: AxiosRequestConfig = {}): Promise<any> {
    return this.client.delete(path, this.getConfig(config));
  }
} 