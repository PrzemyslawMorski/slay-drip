import { config, getApiUrl, debugLog } from '../config/environment';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base API service class
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
    debugLog('API Service initialized', { baseUrl: this.baseUrl });
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);
    
    debugLog('Making API request', { url, method: options.method || 'GET' });

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      debugLog('API response received', { endpoint, status: response.status });
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      debugLog('API request failed', { endpoint, error });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0
      );
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Specific API methods for the application
export const itemsApi = {
  // Get all items
  getAll: () => apiService.get('/items'),
  
  // Get item by ID
  getById: (id: string) => apiService.get(`/items/${id}`),
  
  // Create new item
  create: (item: any) => apiService.post('/items', item),
  
  // Update item
  update: (id: string, item: any) => apiService.put(`/items/${id}`, item),
  
  // Delete item
  delete: (id: string) => apiService.delete(`/items/${id}`),
};

export const outfitsApi = {
  // Get all outfits
  getAll: () => apiService.get('/outfits'),
  
  // Get outfit by ID
  getById: (id: string) => apiService.get(`/outfits/${id}`),
  
  // Create new outfit
  create: (outfit: any) => apiService.post('/outfits', outfit),
  
  // Update outfit
  update: (id: string, outfit: any) => apiService.put(`/outfits/${id}`, outfit),
  
  // Delete outfit
  delete: (id: string) => apiService.delete(`/outfits/${id}`),
};

// Health check endpoint
export const healthApi = {
  check: () => apiService.get('/health'),
};
