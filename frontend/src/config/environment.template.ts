// Environment configuration template for different deployment environments
export interface EnvironmentConfig {
  apiBaseUrl: string;
  appTitle: string;
  environment: string;
  enableDebug: boolean;
}

// Development environment configuration
const devConfig: EnvironmentConfig = {
  apiBaseUrl: 'http://localhost:3000',
  appTitle: 'Slay Drip - Development',
  environment: 'development',
  enableDebug: true,
};

// Live environment configuration
const liveConfig: EnvironmentConfig = {
  apiBaseUrl: '__API_BASE_URL__', // This will be replaced during build
  appTitle: 'Slay Drip',
  environment: 'production',
  enableDebug: false,
};

// Determine current environment
const getCurrentEnvironment = (): string => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  // Check for environment override
  if (import.meta.env.VITE_ENVIRONMENT) {
    return import.meta.env.VITE_ENVIRONMENT;
  }
  
  // Default to production for built apps
  return 'production';
};

// Export the appropriate configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = getCurrentEnvironment();
  
  switch (env) {
    case 'development':
      return devConfig;
    case 'production':
      return liveConfig;
    default:
      console.warn(`Unknown environment: ${env}, falling back to development`);
      return devConfig;
  }
};

// Export current config for easy access
export const config = getEnvironmentConfig();

// Helper function to get API URL for specific endpoint
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.apiBaseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Debug logging helper
export const debugLog = (message: string, data?: any): void => {
  if (config.enableDebug) {
    console.log(`[${config.environment}] ${message}`, data || '');
  }
};
