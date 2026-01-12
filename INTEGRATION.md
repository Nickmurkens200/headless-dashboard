# Frontend Integration Guide

This guide explains how to integrate the Headless Dashboard API with your own custom Next.js (or any) frontend.

## Table of Contents

1. [Overview](#overview)
2. [API Client Setup](#api-client-setup)
3. [Authentication](#authentication)
4. [Fetching Services](#fetching-services)
5. [Icon Integration](#icon-integration)
6. [Admin Features](#admin-features)
7. [Environment Variables](#environment-variables)
8. [TypeScript Types](#typescript-types)
9. [Example Components](#example-components)

---

## Overview

The Headless Dashboard backend is a standalone NestJS API that handles:
- Authentication (None, Local, SSO/OIDC, or Mixed)
- Service/bookmark management
- Category organization
- User management
- Icon search (Selfh.st integration)
- Global configuration

Your frontend only needs to make HTTP requests to the API endpoints.

### Base URL

```
http://localhost:4000/api
```

Or configure via environment variable:
```
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## API Client Setup

### Minimal API Client (Copy this to your project)

```typescript
// lib/dashboard-api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Token storage
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
}

export function loadTokens() {
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
```

---

## Authentication

### Check Auth Configuration

First, check what authentication mode is enabled:

```typescript
// GET /api/config/auth
interface AuthConfig {
  authMode: 'NONE' | 'LOCAL' | 'SSO' | 'MIXED';
  allowPublicRegistration: boolean;
  ssoEnabled: boolean;
}

const authConfig = await apiFetch<AuthConfig>('/config/auth');

if (authConfig.authMode === 'NONE') {
  // No login required, show dashboard directly
}
```

### Login (Local Auth)

```typescript
// POST /api/auth/login
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  setTokens(data.accessToken, data.refreshToken);
  return data.user;
}
```

### Register (if enabled)

```typescript
// POST /api/auth/register
async function register(email: string, password: string, username?: string) {
  const data = await apiFetch<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  });
  
  setTokens(data.accessToken, data.refreshToken);
  return data.user;
}
```

### SSO Login

```typescript
// Redirect user to SSO
function redirectToSSO() {
  window.location.href = `${API_URL}/auth/sso/authorize`;
}

// Handle callback (on your /auth/callback page)
// The API redirects back with ?accessToken=...&refreshToken=...
function handleSSOCallback() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  
  if (accessToken && refreshToken) {
    setTokens(accessToken, refreshToken);
    window.location.href = '/'; // Redirect to dashboard
  }
}
```

### Get Current User

```typescript
// GET /api/auth/me
interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string;
}

const user = await apiFetch<User>('/auth/me');
```

### Logout

```typescript
// POST /api/auth/logout
async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}
```

---

## Fetching Services

### Get All Services

```typescript
// GET /api/services
interface Service {
  id: string;
  name: string;
  description?: string;
  url: string;
  iconUrl?: string;
  iconSlug?: string;
  category: string;
  isPublic: boolean;
  isEnabled: boolean;
  lastHealthStatus?: 'online' | 'offline' | 'unknown';
}

const services = await apiFetch<Service[]>('/services');
```

### Get Services by Category

```typescript
// GET /api/services?category=Media
const mediaServices = await apiFetch<Service[]>('/services?category=Media');
```

### Get Categories

```typescript
// GET /api/categories
interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
}

const categories = await apiFetch<Category[]>('/categories');
```

### Check Service Health

```typescript
// GET /api/services/:id/health
interface HealthStatus {
  status: 'online' | 'offline' | 'unknown';
  responseTime?: number;
}

const health = await apiFetch<HealthStatus>(`/services/${serviceId}/health`);
```

---

## Icon Integration

The API integrates with [Selfh.st Icons](https://selfh.st/icons/) - 200+ icons for self-hosted apps.

### Search Icons

```typescript
// GET /api/icons/search?q=plex&limit=12
interface IconResult {
  slug: string;
  name: string;
  pngUrl: string;
  svgUrl?: string;
}

const icons = await apiFetch<IconResult[]>('/icons/search?q=plex&limit=12');
```

### Get All Icons

```typescript
// GET /api/icons
const allIcons = await apiFetch<IconResult[]>('/icons');
```

### Build Icon URL from Slug

```typescript
const ICON_CDN = 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/';

function getIconUrl(slugOrUrl: string): string {
  if (slugOrUrl.startsWith('http')) {
    return slugOrUrl;
  }
  return `${ICON_CDN}${slugOrUrl}.png`;
}

// Usage
<img src={getIconUrl(service.iconSlug || service.iconUrl)} alt={service.name} />
```

### Icon Picker Component Example

```tsx
function IconPicker({ onSelect }: { onSelect: (slug: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IconResult[]>([]);

  useEffect(() => {
    if (query.length < 2) return;
    
    const timeout = setTimeout(async () => {
      const icons = await apiFetch<IconResult[]>(`/icons/search?q=${query}&limit=20`);
      setResults(icons);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div>
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="Search icons..."
      />
      <div className="icon-grid">
        {results.map(icon => (
          <button key={icon.slug} onClick={() => onSelect(icon.slug)}>
            <img src={icon.pngUrl} alt={icon.name} />
            <span>{icon.slug}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Admin Features

Admin endpoints require `role: 'ADMIN'`.

### Create Service

```typescript
// POST /api/services (Admin only)
const newService = await apiFetch<Service>('/services', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Plex',
    url: 'http://192.168.1.100:32400',
    iconSlug: 'plex',
    category: 'Media',
    isPublic: false,
  }),
});
```

### Update Service

```typescript
// PUT /api/services/:id (Admin only)
await apiFetch(`/services/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: 'Updated Name' }),
});
```

### Delete Service

```typescript
// DELETE /api/services/:id (Admin only)
await apiFetch(`/services/${id}`, { method: 'DELETE' });
```

### Update Global Configuration

```typescript
// PUT /api/config (Admin only)
await apiFetch('/config', {
  method: 'PUT',
  body: JSON.stringify({
    appTitle: 'My Dashboard',
    authMode: 'LOCAL',
    allowPublicRegistration: false,
    themeSettings: {
      mode: 'dark',
      primaryColor: '#6366f1',
    },
  }),
});
```

### Configure SSO

```typescript
// PUT /api/config (Admin only)
await apiFetch('/config', {
  method: 'PUT',
  body: JSON.stringify({
    authMode: 'SSO', // or 'MIXED'
    ssoProviderConfig: {
      issuer: 'https://auth.example.com',
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      scopes: 'openid profile email',
    },
  }),
});
```

### User Management

```typescript
// GET /api/users (Admin only)
const users = await apiFetch<User[]>('/users');

// POST /api/users (Admin only)
await apiFetch('/users', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    role: 'USER',
  }),
});

// PUT /api/users/:id (Admin only)
await apiFetch(`/users/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ role: 'ADMIN' }),
});

// DELETE /api/users/:id (Admin only)
await apiFetch(`/users/${id}`, { method: 'DELETE' });
```

---

## Environment Variables

### Required in your Next.js app

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### For production (behind reverse proxy)

```env
NEXT_PUBLIC_API_URL=https://dashboard.example.com/api
```

---

## TypeScript Types

Copy these types to your project:

```typescript
// types/dashboard.ts

export type AuthMode = 'NONE' | 'LOCAL' | 'SSO' | 'MIXED';
export type Role = 'USER' | 'ADMIN';
export type HealthStatus = 'online' | 'offline' | 'unknown';

export interface AuthConfig {
  authMode: AuthMode;
  allowPublicRegistration: boolean;
  ssoEnabled: boolean;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  url: string;
  iconUrl?: string;
  iconSlug?: string;
  category: string;
  sortOrder: number;
  isPublic: boolean;
  isEnabled: boolean;
  healthCheckUrl?: string;
  healthCheckInterval?: number;
  lastHealthCheck?: string;
  lastHealthStatus?: HealthStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isPublic: boolean;
}

export interface IconResult {
  slug: string;
  name: string;
  pngUrl: string;
  svgUrl?: string;
}

export interface GlobalConfig {
  appTitle: string;
  baseUrl?: string;
  authMode: AuthMode;
  allowPublicRegistration: boolean;
  iconSourceUrl: string;
  themeSettings?: {
    mode: 'dark' | 'light';
    primaryColor: string;
    customCss?: string;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}
```

---

## Example Components

### Auth Hook

```tsx
// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { apiFetch, loadTokens, clearTokens, setTokens } from '@/lib/dashboard-api';
import type { User, AuthConfig } from '@/types/dashboard';

interface AuthContextValue {
  user: User | null;
  authConfig: AuthConfig | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTokens();
    
    Promise.all([
      apiFetch<AuthConfig>('/config/auth'),
      apiFetch<User>('/auth/me').catch(() => null),
    ]).then(([config, userData]) => {
      setAuthConfig(config);
      setUser(userData);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      authConfig,
      isLoading,
      isAuthenticated: !!user || authConfig?.authMode === 'NONE',
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
```

### Service Grid

```tsx
// components/ServiceGrid.tsx
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/dashboard-api';
import type { Service, Category } from '@/types/dashboard';

const ICON_CDN = 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/';

function getIconUrl(service: Service): string {
  if (service.iconUrl) return service.iconUrl;
  if (service.iconSlug) return `${ICON_CDN}${service.iconSlug}.png`;
  return '/default-icon.png';
}

export function ServiceGrid() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<Service[]>('/services'),
      apiFetch<Category[]>('/categories'),
    ]).then(([s, c]) => {
      setServices(s);
      setCategories(c);
    });
  }, []);

  const servicesByCategory = categories.map(cat => ({
    category: cat,
    services: services.filter(s => s.category === cat.name),
  }));

  return (
    <div>
      {servicesByCategory.map(({ category, services }) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <div className="grid">
            {services.map(service => (
              <a 
                key={service.id} 
                href={service.url} 
                target="_blank" 
                rel="noopener"
                className="service-card"
              >
                <img src={getIconUrl(service)} alt="" />
                <div>
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                </div>
                <span className={`status ${service.lastHealthStatus}`} />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/config/public` | No | Public config (title, theme) |
| GET | `/config/auth` | No | Auth mode configuration |
| GET | `/config` | Admin | Full configuration |
| PUT | `/config` | Admin | Update configuration |
| POST | `/auth/login` | No | Local login |
| POST | `/auth/register` | No* | Register new user |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Logout / invalidate session |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/auth/sso/authorize` | No | Start SSO flow |
| GET | `/auth/sso/callback` | No | SSO callback |
| GET | `/services` | No* | List services |
| POST | `/services` | Admin | Create service |
| PUT | `/services/:id` | Admin | Update service |
| DELETE | `/services/:id` | Admin | Delete service |
| GET | `/services/:id/health` | Yes | Check service health |
| GET | `/categories` | No | List categories |
| POST | `/categories` | Admin | Create category |
| PUT | `/categories/:id` | Admin | Update category |
| DELETE | `/categories/:id` | Admin | Delete category |
| GET | `/icons` | No | List all icons |
| GET | `/icons/search?q=` | No | Search icons |
| GET | `/users` | Admin | List users |
| POST | `/users` | Admin | Create user |
| PUT | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |
| GET | `/health` | No | API health check |

*Depends on configuration

---

## Quick Start Checklist

1. [ ] Copy `lib/dashboard-api.ts` to your project
2. [ ] Copy `types/dashboard.ts` to your project
3. [ ] Set `NEXT_PUBLIC_API_URL` environment variable
4. [ ] Wrap your app with `AuthProvider`
5. [ ] Check `authConfig.authMode` to determine login requirements
6. [ ] Fetch services from `/services` endpoint
7. [ ] Use icon slugs with Selfh.st CDN URL
8. [ ] Add admin pages for service/user management (if needed)

---

## Need Help?

- Check API health: `GET /api/health`
- View API docs: `GET /api/docs` (Swagger UI)
- Default login: `admin@localhost` / `admin`
