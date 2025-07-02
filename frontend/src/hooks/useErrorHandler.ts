import { useCallback, useState } from 'react';
import { AxiosError } from 'axios';

export interface AppError {
  message: string;
  userMessage: string;
  errorCode?: string;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp?: string;
  isTransient?: boolean;
}

export interface ErrorState {
  error: AppError | null;
  isError: boolean;
  isLoading: boolean;
}

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  onError?: (error: AppError) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logError = true, onError } = options;
  
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    isLoading: false
  });

  const parseError = useCallback((error: any): AppError => {
    // Handle structured API errors
    if (error?.response?.data?.detail) {
      const detail = error.response.data.detail;
      
      // Check if it's our structured error format
      if (typeof detail === 'object' && detail.error_code) {
        return {
          message: detail.message || 'An error occurred',
          userMessage: detail.user_message || detail.message || 'Something went wrong',
          errorCode: detail.error_code,
          statusCode: error.response.status,
          details: detail.details,
          timestamp: detail.timestamp,
          isTransient: detail.details?.is_transient
        };
      }
      
      // Handle simple string error detail
      if (typeof detail === 'string') {
        return {
          message: detail,
          userMessage: detail,
          statusCode: error.response.status,
          isTransient: error.response.status >= 500
        };
      }
    }

    // Handle Axios errors
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status || 0;
      
      // Network errors
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        return {
          message: 'Network connection failed',
          userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
          errorCode: 'NETWORK_ERROR',
          isTransient: true
        };
      }

      // Timeout errors
      if (error.code === 'ECONNABORTED') {
        return {
          message: 'Request timeout',
          userMessage: 'The request took too long to complete. Please try again.',
          errorCode: 'TIMEOUT_ERROR',
          isTransient: true
        };
      }

      // HTTP status code specific handling
      switch (statusCode) {
        case 401:
          return {
            message: 'Unauthorized',
            userMessage: 'Your session has expired. Please log in again.',
            errorCode: 'UNAUTHORIZED',
            statusCode,
            isTransient: false
          };
        
        case 403:
          return {
            message: 'Forbidden',
            userMessage: "You don't have permission to perform this action.",
            errorCode: 'FORBIDDEN',
            statusCode,
            isTransient: false
          };
        
        case 404:
          return {
            message: 'Not found',
            userMessage: 'The requested resource could not be found.',
            errorCode: 'NOT_FOUND',
            statusCode,
            isTransient: false
          };
        
        case 422:
          return {
            message: 'Validation error',
            userMessage: 'Please check your input and try again.',
            errorCode: 'VALIDATION_ERROR',
            statusCode,
            isTransient: false
          };
        
        case 429:
          return {
            message: 'Too many requests',
            userMessage: 'Too many requests. Please wait a moment before trying again.',
            errorCode: 'RATE_LIMIT_EXCEEDED',
            statusCode,
            isTransient: true
          };
        
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            message: 'Server error',
            userMessage: "We're experiencing technical difficulties. Please try again in a few minutes.",
            errorCode: 'SERVER_ERROR',
            statusCode,
            isTransient: true
          };
        
        default:
          return {
            message: error.message || 'HTTP error',
            userMessage: 'An unexpected error occurred. Please try again.',
            errorCode: 'HTTP_ERROR',
            statusCode,
            isTransient: statusCode >= 500
          };
      }
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return {
        message: error.message,
        userMessage: 'An unexpected error occurred. Please try again.',
        errorCode: 'JAVASCRIPT_ERROR',
        isTransient: false
      };
    }

    // Fallback for unknown error types
    return {
      message: String(error || 'Unknown error'),
      userMessage: 'An unexpected error occurred. Please try again.',
      errorCode: 'UNKNOWN_ERROR',
      isTransient: false
    };
  }, []);

  const handleError = useCallback((error: any) => {
    const appError = parseError(error);
    
    // Update error state
    setErrorState({
      error: appError,
      isError: true,
      isLoading: false
    });

    // Log error in development or if explicitly requested
    if (logError && (process.env.NODE_ENV === 'development' || logError)) {
      console.error('Error handled:', {
        original: error,
        parsed: appError,
        timestamp: new Date().toISOString()
      });
    }

    // Show toast notification
    if (showToast) {
      // TODO: Integrate with toast system when available
      // toast.error(appError.userMessage);
    }

    // Call custom error handler
    if (onError) {
      onError(appError);
    }

    return appError;
  }, [parseError, logError, showToast, onError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      isLoading: false
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading,
      isError: loading ? false : prev.isError
    }));
  }, []);

  // Wrapper for async operations with automatic error handling
  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await operation();
      clearError();
      return result;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, handleError]);

  // Wrapper for sync operations with automatic error handling
  const withSyncErrorHandling = useCallback(<T>(
    operation: () => T
  ): T | null => {
    try {
      clearError();
      return operation();
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [clearError, handleError]);

  return {
    ...errorState,
    handleError,
    clearError,
    setLoading,
    withErrorHandling,
    withSyncErrorHandling,
    parseError
  };
}