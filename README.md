# Headless Dashboard

A headless, self-hosted dashboard application with enterprise-grade settings and Selfh.st icon integration. Built with a clean separation between backend (NestJS) and frontend (Next.js 14).

## Features

### Core Philosophy
- **Zero Hardcoding**: All URLs are injectable via environment variables
- **Headless & API-First**: Backend is the source of truth
- **User-Controlled Auth**: Choose from None, Local, SSO, or Mixed authentication

### Key Features
- 🔐 **Flexible Authentication**: No auth, local login, OIDC/SSO, or mixed mode
- 🎨 **Selfh.st Icons**: Built-in icon picker with 200+ self-hosted app icons
- 🌓 **Theme Support**: Dark/light mode with custom accent colors
- 📱 **Responsive UI**: Works on desktop and mobile
- 🐳 **Docker Ready**: Production-ready Docker Compose setup
- 🔒 **Role-Based Access**: Admin and User roles with granular permissions
- 📊 **Health Monitoring**: Service status checks and system health

## Documentation

- **[README.md](README.md)** - This file, setup and deployment
- **[INTEGRATION.md](INTEGRATION.md)** - Guide for integrating with your own frontend

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone or download the project
cd headless-dashboard

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start all services
docker-compose up -d

# Access the dashboard
open http://localhost:3000
```

### Default Credentials
- **Email**: admin@localhost
- **Password**: admin

⚠️ **Change the default password immediately!**

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js UI    │────▶│   NestJS API    │────▶│   PostgreSQL    │
│   (Port 3000)   │     │   (Port 4000)   │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | Database username | `dashboard` |
| `DB_PASSWORD` | Database password | `dashboard_secret` |
| `DB_NAME` | Database name | `dashboard` |
| `JWT_SECRET` | JWT signing secret | (generate one!) |
| `FRONTEND_URL` | Frontend URL for redirects | `http://localhost:3000` |
| `API_BASE_URL` | API URL for callbacks | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | API URL (browser-accessible) | `http://localhost:4000/api` |
| `NEXT_PUBLIC_ICON_SOURCE` | Selfh.st icons CDN | `https://cdn.jsdelivr.net/gh/selfhst/icons/png/` |

### Authentication Modes

Configure via Admin Panel → Settings → Authentication:

1. **NONE**: No authentication required (public dashboard)
2. **LOCAL**: Email/password authentication
3. **SSO**: OIDC/OAuth only (Authentik, Keycloak, Zitadel, etc.)
4. **MIXED**: Both local and SSO options

### SSO Configuration (OIDC)

1. Create an application in your identity provider
2. Set the redirect URI: `{API_BASE_URL}/api/auth/sso/callback`
3. Configure in Admin Panel:
   - Issuer URL
   - Client ID
   - Client Secret

## Admin Panel

Access at `/admin` (requires admin role):

- **Overview**: System stats and health status
- **Services**: Add/edit/delete services with icon picker
- **Settings**: General config, authentication mode, SSO setup
- **Users**: User management (create, edit, roles)
- **Appearance**: Theme mode, accent colors, custom CSS

## Icon System

Uses [Selfh.st Icons](https://selfh.st/icons/) with 200+ icons for self-hosted apps:

1. **Search**: Type in the icon picker to search
2. **Select**: Click an icon to use it
3. **Custom URL**: Or paste any image URL

Icons are loaded from CDN: `https://cdn.jsdelivr.net/gh/selfhst/icons/png/`

## API Endpoints

### Public Endpoints
- `GET /api/config/public` - Public configuration
- `GET /api/config/auth` - Authentication config
- `GET /api/services` - List services (filtered by auth)
- `GET /api/icons/search?q=plex` - Search icons
- `GET /api/health` - Health check

### Protected Endpoints (JWT Required)
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (if enabled)
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Current user

### Admin Endpoints
- `PUT /api/config` - Update configuration
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- All `/api/users/*` endpoints

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Backend (API)

```bash
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend (UI)

```bash
cd ui
npm install
npm run dev
```

## Production Deployment

### Behind Reverse Proxy (Caddy Example)

```caddyfile
dashboard.example.com {
    handle /api/* {
        reverse_proxy dashboard-api:4000
    }
    handle {
        reverse_proxy dashboard-ui:3000
    }
}
```

Update `.env`:
```env
FRONTEND_URL=https://dashboard.example.com
API_BASE_URL=https://dashboard.example.com
NEXT_PUBLIC_API_URL=https://dashboard.example.com/api
CORS_ORIGINS=https://dashboard.example.com
```

### Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET: `openssl rand -hex 32`
- [ ] Use strong database password
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Review authentication mode settings

## Database Schema

```prisma
model GlobalConfig {
  appTitle, baseUrl, authMode, 
  ssoProviderConfig (JSON), themeSettings (JSON)
}

model Service {
  name, url, iconUrl, iconSlug, 
  category, isPublic, healthCheckUrl
}

model User {
  email, passwordHash, role, 
  ssoSubject, ssoProvider
}

model Category {
  name, icon, sortOrder, isPublic
}
```

## License

MIT

## Using Your Own Frontend

This is a **headless** dashboard - you can use the API backend with any frontend you build.

See **[INTEGRATION.md](INTEGRATION.md)** for a complete guide including:
- API client setup (copy-paste ready)
- Authentication flow (Local + SSO)
- TypeScript types
- Example React components
- All API endpoints reference

### Quick Example

```typescript
// Fetch services from the API
const API_URL = 'http://localhost:4000/api';

const services = await fetch(`${API_URL}/services`).then(r => r.json());

// Display with Selfh.st icons
services.forEach(service => {
  const iconUrl = service.iconSlug 
    ? `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${service.iconSlug}.png`
    : service.iconUrl;
  
  console.log(service.name, iconUrl);
});
```

## Credits

- [Selfh.st Icons](https://selfh.st/icons/) - Dashboard icons
- [NestJS](https://nestjs.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [Prisma](https://prisma.io/) - Database ORM
