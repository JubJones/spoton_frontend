import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  timestamp: string;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseURL: 'http://localhost:8000/api/v1',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add timestamp
        config.headers['X-Request-Time'] = new Date().toISOString();
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Retry logic
        if (
          error.response?.status !== 401 &&
          originalRequest &&
          !originalRequest._retry &&
          this.config.retries > 0
        ) {
          originalRequest._retry = true;
          
          for (let i = 0; i < this.config.retries; i++) {
            try {
              await this.delay(this.config.retryDelay * (i + 1));
              return this.client(originalRequest);
            } catch (retryError) {
              if (i === this.config.retries - 1) {
                throw retryError;
              }
            }
          }
        }

        // Handle specific error cases
        const apiError: ApiError = {
          message: (error.response?.data as any)?.message || error.message,
          code: (error.response?.data as any)?.code || 'UNKNOWN_ERROR',
          status: error.response?.status || 0,
          timestamp: new Date().toISOString(),
          details: (error.response?.data as any)?.details,
        };

        return Promise.reject(apiError);
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP Methods
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, { params });
    return {
      data: response.data,
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return {
      data: response.data,
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data);
    return {
      data: response.data,
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data);
    return {
      data: response.data,
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url);
    return {
      data: response.data,
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.client.defaults.baseURL = this.config.baseURL;
    this.client.defaults.timeout = this.config.timeout;
  }
}

// Export default instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };