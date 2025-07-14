import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config/environment';

// Types for retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// Extend axios config for retry functionality
interface RetryableAxiosConfig extends AxiosRequestConfig {
  __retryCount?: number;
  __requestStartTime?: number;
  __customRetryConfig?: RetryConfig;
}

// Extended AxiosError with additional context
interface ExtendedAxiosError extends AxiosError {
  timestamp?: string;
  requestConfig?: {
    url: string;
    method: string;
    timeout: number;
  };
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors, timeouts, and 5xx errors
    return !error.response || 
           error.code === 'NETWORK_ERROR' || 
           error.code === 'ECONNABORTED' ||
           (error.response.status >= 500 && error.response.status < 600) ||
           error.response.status === 429; // Rate limit
  }
};

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Utility function to sleep/delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced retry logic with exponential backoff
const retryRequest = async (
  error: AxiosError,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<AxiosResponse> => {
  const { retries, retryDelay, retryCondition } = retryConfig;
  
  // Check if we should retry this error
  if (!retryCondition || !retryCondition(error)) {
    return Promise.reject(error);
  }

  // Get current retry attempt from config
  const currentRetry = (error.config as RetryableAxiosConfig)?.__retryCount || 0;
  
  // If we've exceeded max retries, reject
  if (currentRetry >= retries) {
    console.error(`API request failed after ${retries} retries:`, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }

  // Increment retry count
  (error.config as RetryableAxiosConfig).__retryCount = currentRetry + 1;

  // Calculate delay with exponential backoff and jitter
  const delay = retryDelay * Math.pow(2, currentRetry) + Math.random() * 1000;
  
  console.warn(`API request failed, retrying in ${delay}ms (attempt ${currentRetry + 1}/${retries}):`, {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    message: error.message
  });

  // Wait before retrying
  await sleep(delay);

  // Retry the request
  return api.request(error.config!);
};

// Request interceptor to add auth token and retry config
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add timestamp for request tracking
    (config as RetryableAxiosConfig).__requestStartTime = Date.now();
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling and retry logic
api.interceptors.response.use(
  (response) => {
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      const startTime = (response.config as RetryableAxiosConfig).__requestStartTime;
      const duration = startTime ? Date.now() - startTime : 'unknown';
      console.debug(`API Success [${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    // Log error details
    const startTime = (error.config as RetryableAxiosConfig)?.__requestStartTime;
    const duration = startTime ? Date.now() - startTime : 'unknown';
    
    console.error(`API Error [${error.response?.status || 'Network'}] ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms):`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      data: error.response?.data
    });

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('Authentication failed, clearing tokens and redirecting to login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Avoid redirect loops by checking current path
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle specific error cases that shouldn't be retried
    if (error.response?.status === 403 || error.response?.status === 404 || error.response?.status === 422) {
      return Promise.reject(error);
    }

    // Attempt retry for eligible errors
    try {
      return await retryRequest(error);
    } catch (retryError) {
      // If retry fails, return the original error
      return Promise.reject(retryError);
    }
  }
);

// Enhanced API wrapper with additional error context
export const apiRequest = async <T = unknown>(
  config: AxiosRequestConfig,
  customRetryConfig?: Partial<RetryConfig>
): Promise<T> => {
  try {
    // Merge custom retry config with defaults
    if (customRetryConfig) {
      (config as RetryableAxiosConfig).__customRetryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...customRetryConfig
      };
    }

    const response = await api.request<T>(config);
    return response.data;
  } catch (error) {
    // Add additional context to the error
    if (error instanceof AxiosError) {
      (error as ExtendedAxiosError).timestamp = new Date().toISOString();
      (error as ExtendedAxiosError).requestConfig = {
        method: config.method,
        url: config.url,
        timeout: config.timeout
      };
    }
    throw error;
  }
};

// Convenience methods with retry support
export const apiGet = <T = unknown>(
  url: string, 
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> => 
  apiRequest<T>({ ...config, method: 'GET', url }, retryConfig);

export const apiPost = <T = unknown>(
  url: string, 
  data?: unknown, 
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> => 
  apiRequest<T>({ ...config, method: 'POST', url, data }, retryConfig);

export const apiPut = <T = unknown>(
  url: string, 
  data?: unknown, 
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> => 
  apiRequest<T>({ ...config, method: 'PUT', url, data }, retryConfig);

export const apiDelete = <T = unknown>(
  url: string, 
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> => 
  apiRequest<T>({ ...config, method: 'DELETE', url }, retryConfig);

export default api; 