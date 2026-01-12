# Headless Dashboard

A headless, self-hosted dashboard application with enterprise-grade settings and Selfh.st icon integration. Built with a clean separation between backend (NestJS) and frontend (Next.js 14).

## Features

- 🔐 **Flexible Authentication**: No auth, local login, OIDC/SSO, or mixed mode
- 🎨 **Selfh.st Icons**: Built-in icon picker with 200+ self-hosted app icons
- 🌓 **Theme Support**: Dark/light mode with custom accent colors
- 📱 **Responsive UI**: Works on desktop and mobile
- 🐳 **Docker Ready**: Production-ready Docker Compose setup
- 🔒 **Role-Based Access**: Admin and User roles with granular permissions
- 📊 **Health Monitoring**: Service status checks and system health
- 🔌 **Headless API**: Use with any frontend (see [INTEGRATION.md](INTEGRATION.md))

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   NestJS API    │────▶│   PostgreSQL    │
│   (Port 3000)   │     │   (Port 4000)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Table of Contents

1. [Install Docker (Ubuntu 24/25)](#install-docker-ubuntu-2425)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Admin Panel](#admin-panel)
5. [Reverse Proxy Setup](#reverse-proxy-setup)
6. [Useful Commands](#useful-commands)
7. [Development](#development)
8. [Using Your Own Frontend](#using-your-own-frontend)
9. [API Reference](#api-reference)

---

## Install Docker (Ubuntu 24/25)

Skip this section if you already have Docker installed.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (no more sudo needed)
sudo usermod -aG docker $USER

# Apply group changes (or logout and login again)
newgrp docker

# Verify installation
docker --version
docker compose version
```

**Test Docker:**
```bash
docker run hello-world
```

---

## Quick Start

### Option 1: Using Setup Script (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Nickmurkens200/Headless-dashboard.git
cd headless-dashboard

# 2. Run setup script (creates .env with secure defaults)
./setup.sh

# 3. Start the dashboard
docker compose up -d

# 4. Open in browser
echo "Dashboard ready at http://localhost:3000"
```

### Option 2: Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/headless-dashboard.git
cd headless-dashboard

# 2. Copy environment file (or create from scratch if missing)
cp .env.example .env 2>/dev/null || ./setup.sh

# 3. Edit .env with your settings
nano .env

# 4. Start the dashboard
docker compose up -d
```

### Option 3: One-Liner (Quick Setup)

```bash
git clone https://github.com/YOUR_USERNAME/headless-dashboard.git && \
cd headless-dashboard && \
chmod +x setup.sh && ./setup.sh && \
docker compose up -d && \
echo "Dashboard ready at http://localhost:3000"
```

### Default Login

| Field | Value |
|-------|-------|
| Email | `admin@localhost` |
| Password | `admin` |

⚠️ **Change the default password immediately after first login!**

---

## Configuration

### Environment Variables

Edit `.env` to configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | Database password | `dashboard_secret` |
| `JWT_SECRET` | JWT signing secret | **Must change!** |
| `API_PORT` | API port | `4000` |
| `UI_PORT` | Frontend port | `3000` |
| `FRONTEND_URL` | Public frontend URL | `http://localhost:3000` |
| `API_BASE_URL` | Public API URL | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | API URL for browser | `http://localhost:4000/api` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |

### Authentication Modes

Configure in **Admin Panel → Settings → Authentication**:

| Mode | Description |
|------|-------------|
| `NONE` | No login required (public dashboard) |
| `LOCAL` | Email/password authentication |
| `SSO` | OIDC/OAuth only (Authentik, Keycloak, Zitadel, etc.) |
| `MIXED` | Both local and SSO options |

### SSO Setup (OIDC)

1. Create an application in your identity provider
2. Set redirect URI: `{API_BASE_URL}/api/auth/sso/callback`
3. Configure in Admin Panel → Settings:
   - Issuer URL
   - Client ID
   - Client Secret
   - Scopes (default: `openid profile email`)

---

## Admin Panel

Access at `/admin` (requires admin role):

| Page | Description |
|------|-------------|
| **Overview** | System stats and health status |
| **Services** | Add/edit/delete services with icon picker |
| **Settings** | App title, authentication mode, SSO config |
| **Users** | User management (create, edit, assign roles) |
| **Appearance** | Theme mode, accent colors, custom CSS |

### Icon System

Uses [Selfh.st Icons](https://selfh.st/icons/) with 200+ icons:
- Search icons in the service editor
- Click to select
- Or paste any custom image URL

---

## Reverse Proxy Setup

### Caddy (Recommended)

```caddyfile
dashboard.example.com {
    handle /api/* {
        reverse_proxy localhost:4000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

### Nginx

```nginx
server {
    listen 80;
    server_name dashboard.example.com;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Update .env for Production

```env
FRONTEND_URL=https://dashboard.example.com
API_BASE_URL=https://dashboard.example.com
NEXT_PUBLIC_API_URL=https://dashboard.example.com/api
CORS_ORIGINS=https://dashboard.example.com
```

Then rebuild:
```bash
docker compose up -d --build
```

---

## Useful Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f dashboard-api
docker compose logs -f dashboard-ui
docker compose logs -f postgres

# Rebuild after code changes
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build dashboard-api

# Reset database (deletes all data!)
docker compose down -v
docker compose up -d

# Update from GitHub
git pull
docker compose up -d --build

# Check service status
docker compose ps

# Enter container shell
docker compose exec dashboard-api sh
docker compose exec dashboard-ui sh
```

---

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Backend (NestJS API)

```bash
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API runs at http://localhost:4000
Swagger docs at http://localhost:4000/api/docs

### Frontend (Next.js UI)

```bash
cd ui
npm install
npm run dev
```

UI runs at http://localhost:3000

---

## Using Your Own Frontend

This is a **headless** dashboard - use the API with any frontend you build!

See **[INTEGRATION.md](INTEGRATION.md)** for:
- Complete API client (copy-paste ready)
- Authentication flow (Local + SSO)
- TypeScript types
- Example React components
- All endpoints reference

### Quick Example

```typescript
const API_URL = 'http://localhost:4000/api';

// Fetch services
const services = await fetch(`${API_URL}/services`).then(r => r.json());

// Build icon URL
const getIconUrl = (service) => {
  if (service.iconSlug) {
    return `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${service.iconSlug}.png`;
  }
  return service.iconUrl || '/default-icon.png';
};
```

---

## API Reference

### Public Endpoints (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config/public` | Public config (title, theme) |
| GET | `/api/config/auth` | Auth mode configuration |
| GET | `/api/services` | List services (filtered by visibility) |
| GET | `/api/categories` | List categories |
| GET | `/api/icons` | List all icons |
| GET | `/api/icons/search?q=plex` | Search icons |

### Auth Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Register (if enabled) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/sso/authorize` | Start SSO flow |

### Admin Endpoints (Admin Role Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Full configuration |
| PUT | `/api/config` | Update configuration |
| POST | `/api/services` | Create service |
| PUT | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

---

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong `JWT_SECRET`: `openssl rand -hex 32`
- [ ] Set strong `DB_PASSWORD`
- [ ] Use HTTPS in production (reverse proxy)
- [ ] Configure `CORS_ORIGINS` properly
- [ ] Review authentication mode

---

## Troubleshooting

### Missing .env.example file

If `.env.example` is missing, use the setup script instead:

```bash
chmod +x setup.sh && ./setup.sh
```

This creates a `.env` file with secure auto-generated secrets.

### Check hidden files

Files starting with `.` are hidden. To see all files:

```bash
ls -la
```

### Container not starting

Check logs for specific service:

```bash
docker compose logs dashboard-api
docker compose logs dashboard-ui
docker compose logs postgres
```

### Database connection issues

Reset the database:

```bash
docker compose down -v
docker compose up -d
```

### Port already in use

Change ports in `.env`:

```env
API_PORT=4001
UI_PORT=3001
```

---

## License

MIT

## Credits

- [Selfh.st Icons](https://selfh.st/icons/) - Dashboard icons
- [NestJS](https://nestjs.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [Prisma](https://prisma.io/) - Database ORM
