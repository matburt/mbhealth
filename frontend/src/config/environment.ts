interface EnvironmentConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  enableDevTools: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  
  return {
    apiBaseUrl: import.meta.env.VITE_API_URL || 
      (isDevelopment ? 'http://localhost:8000/api/v1' : '/api/v1'),
    wsBaseUrl: import.meta.env.VITE_WS_URL || 
      (isDevelopment ? 'ws://localhost:8000/ws' : '/ws'),
    enableDevTools: isDevelopment && !import.meta.env.VITE_DISABLE_DEVTOOLS,
    logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 
      (isProd ? 'warn' : 'debug')
  };
};

export const config = getEnvironmentConfig();