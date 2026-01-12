import { getApiUrl } from './config';

// Token storage
const TOKEN_KEY = 'auth_tokens';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: Omit<AuthTokens, 'expiresAt'> & { expiresIn: number }): void {
  if (typeof window === 'undefined') return;
  
  const data: AuthTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// API fetch wrapper with authentication
interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...fetchOptions } = options;
  
  const url = `${getApiUrl()}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  // Add auth token if available and not skipped
  if (!skipAuth) {
    const tokens = getStoredTokens();
    if (tokens) {
      // Check if token is expired
      if (tokens.expiresAt < Date.now()) {
        // Try to refresh
        try {
          const refreshed = await refreshTokens(tokens.refreshToken);
          headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
        } catch {
          clearStoredTokens();
        }
      } else {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && !skipAuth) {
    const tokens = getStoredTokens();
    if (tokens) {
      try {
        const refreshed = await refreshTokens(tokens.refreshToken);
        headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
        
        // Retry the request
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
        });
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({}));
          throw new ApiError(retryResponse.status, error.message || 'Request failed');
        }
        
        return retryResponse.json();
      } catch {
        clearStoredTokens();
        throw new ApiError(401, 'Session expired');
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
}

async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh tokens');
  }

  const data = await response.json();
  setStoredTokens(data);
  return data;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// API Methods
export const api = {
  // Auth
  async getAuthConfig() {
    return apiFetch<{ authMode: string; allowPublicRegistration: boolean; ssoIssuer?: string }>(
      '/config/auth',
      { skipAuth: true }
    );
  },

  async login(email: string, password: string) {
    const response = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    setStoredTokens(response);
    return response;
  },

  async register(email: string, password: string, username?: string, displayName?: string) {
    const response = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: any;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, displayName }),
      skipAuth: true,
    });
    setStoredTokens(response);
    return response;
  },

  async logout() {
    const tokens = getStoredTokens();
    if (tokens) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      } catch {
        // Ignore errors
      }
    }
    clearStoredTokens();
  },

  async getMe() {
    return apiFetch('/auth/me');
  },

  getSsoAuthUrl() {
    return `${getApiUrl()}/auth/sso/authorize`;
  },

  // Config
  async getPublicConfig() {
    return apiFetch('/config/public', { skipAuth: true });
  },

  async getFullConfig() {
    return apiFetch('/config');
  },

  async updateConfig(data: any) {
    return apiFetch('/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Services
  async getServices(params?: { category?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString();
    return apiFetch(`/services${queryString ? `?${queryString}` : ''}`);
  },

  async getService(id: string) {
    return apiFetch(`/services/${id}`);
  },

  async createService(data: any) {
    return apiFetch('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateService(id: string, data: any) {
    return apiFetch(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteService(id: string) {
    return apiFetch(`/services/${id}`, { method: 'DELETE' });
  },

  async checkServiceHealth(id: string) {
    return apiFetch(`/services/${id}/health`);
  },

  async checkAllServicesHealth() {
    return apiFetch('/services/health');
  },

  // Categories
  async getCategories() {
    return apiFetch('/categories');
  },

  async createCategory(data: any) {
    return apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: string, data: any) {
    return apiFetch(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: string) {
    return apiFetch(`/categories/${id}`, { method: 'DELETE' });
  },

  // Icons
  async searchIcons(query: string, limit = 20) {
    return apiFetch(`/icons/search?q=${encodeURIComponent(query)}&limit=${limit}`, { skipAuth: true });
  },

  async getAllIcons() {
    return apiFetch('/icons', { skipAuth: true });
  },

  // Users (admin)
  async getUsers() {
    return apiFetch('/users');
  },

  async createUser(data: any) {
    return apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: any) {
    return apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string) {
    return apiFetch(`/users/${id}`, { method: 'DELETE' });
  },

  // Health
  async getHealth() {
    return apiFetch('/health', { skipAuth: true });
  },
};
