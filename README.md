# Request-Approve: Beneficial Ownership Change Request Workflow System

A production-quality full-stack web application that simulates a beneficial ownership information update workflow for compliance review. This system manages role-based request workflows with an immutable audit trail.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Running Locally](#running-locally)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Demo Users](#demo-users)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Features

- **Role-Based Access Control**: Two user roles (APPLICANT, REVIEWER) with specific permissions
- **Workflow State Machine**: Enforced transitions with validation rules
  - DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED/CHANGES_REQUESTED
- **Immutable Audit Trail**: Every transition logged with user, timestamp, and optional comments
- **File Uploads**: Support for attachment uploads with persistent storage
- **OpenAPI-First Design**: Type-safe API contracts using OpenAPI 3.1
- **Full TypeScript**: End-to-end type safety across frontend and backend
- **JWT Authentication**: Secure token-based authentication with 24-hour expiry

## Tech Stack

### Frontend
- **React 19** with Vite
- **React Query** for server state management
- **React Hook Form** for form handling
- **Tailwind CSS 4** for styling
- **Wouter** for client-side routing
- **Zod** for runtime validation

### Backend
- **Node.js 24** runtime
- **Express 5** framework
- **PostgreSQL** database with **Drizzle ORM**
- **JWT** (jsonwebtoken) for authentication
- **bcryptjs** for password hashing
- **Pino** for structured logging
- **Multer** for file uploads

### DevOps
- **pnpm** monorepo with workspaces
- **TypeScript 5.9** for type safety
- **esbuild** for bundling
- **Vitest** for testing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 24.x or higher ([Download](https://nodejs.org/))
- **pnpm** 9.x or higher (`npm install -g pnpm`)
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Git** for version control

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YambwaImwaka/Request-Approve.git
cd Request-Approve
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up PostgreSQL Database

#### Option A: Using Local PostgreSQL (Recommended for Development)

```bash
# Create a new database
createdb beneficial_ownership_dev

# Create a new database user (optional but recommended)
createuser ownership_dev -P  # You'll be prompted for a password
```

#### Option B: Using Docker

```bash
docker run --name beneficial-ownership-postgres \
  -e POSTGRES_DB=beneficial_ownership_dev \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 \
  -d postgres:16
```

### 4. Configure Environment Variables

Create a `.env.local` file in the repository root:

```bash
# Database connection
DATABASE_URL="postgresql://ownership_dev:your_password@localhost:5432/beneficial_ownership_dev"

# JWT signing secret (use a strong random string in production)
SESSION_SECRET="your-super-secret-jwt-key-change-this-in-production"

# API server port (optional, defaults to 8080)
API_PORT=8080

# Node environment
NODE_ENV=development
```

### 5. Initialize the Database Schema

Push the Drizzle schema to PostgreSQL:

```bash
pnpm --filter @workspace/db run push
```

This will:
- Create the `users`, `applications`, and `audit_logs` tables
- Set up enums for `user_role` and `application_status`
- Create necessary indexes

### 6. Seed Demo Data (Optional)

The database will be populated with demo users on first run. Default credentials:

```
Applicant Account:
  Email: applicant@example.com
  Password: password123

Reviewer Account:
  Email: reviewer@example.com
  Password: password123
```

## Running Locally

### Start Both Services (Development Mode)

Open two terminal windows:

**Terminal 1 - API Server:**
```bash
pnpm --filter @workspace/api-server run dev
```

Expected output:
```
[INFO] Server running on http://localhost:8080
```

**Terminal 2 - Frontend:**
```bash
pnpm --filter @workspace/web run dev
```

Expected output:
```
  VITE v7.3.2  ready in 245 ms

  ➜  Local:   http://localhost:22333/
```

### Access the Application

- **Frontend**: http://localhost:22333
- **API**: http://localhost:8080/api
- **Health Check**: http://localhost:8080/api/healthz

### Type Checking

While developing, periodically run type checking:

```bash
pnpm run typecheck
```

## Database Setup

### Viewing the Database

#### Using psql CLI:
```bash
psql -U ownership_dev -d beneficial_ownership_dev

# List tables
\dt

# View users table
SELECT * FROM users;

# View applications with their status
SELECT id, title, status, created_at FROM applications;

# View audit trail for a specific application
SELECT * FROM audit_logs WHERE application_id = 1 ORDER BY timestamp DESC;
```

#### Using GUI Tools:
- [DBeaver Community](https://dbeaver.io/) (Free, multi-platform)
- [pgAdmin](https://www.pgadmin.org/) (Web-based PostgreSQL management)
- [DataGrip](https://www.jetbrains.com/datagrip/) (Paid, JetBrains)

### Reset Database (Development Only)

⚠️ **Warning: This will delete all data**

```bash
# Drop and recreate database
dropdb beneficial_ownership_dev
createdb beneficial_ownership_dev

# Re-push schema
pnpm --filter @workspace/db run push
```

## Project Structure

```
Request-Approve/
├── lib/                          # Shared libraries
│   ├── api-spec/                # OpenAPI specification (source of truth)
│   │   └── openapi.yaml         # All API contract definitions
│   ├── api-zod/                 # Generated Zod validators
│   ├── api-client-react/        # Generated React Query hooks
│   └── db/                       # Database layer
│       └── src/schema/
│           ├── users.ts         # User table schema
│           ├── applications.ts  # Application requests schema
│           └── audit-logs.ts    # Audit trail schema
│
├── artifacts/                    # Application packages
│   ├── api-server/              # Express backend
│   │   ├── src/
│   │   │   ├── routes/          # API endpoints
│   │   │   │   ├── health.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── applications.ts
│   │   │   │   └── upload.ts
│   │   │   ├── lib/
│   │   │   │   ├── workflow.ts  # State machine logic
│   │   │   │   ├── auth.ts      # JWT utilities
│   │   │   │   └── logger.ts    # Pino logger
│   │   │   ├── app.ts           # Express app setup
│   │   │   └── index.ts         # Server entry point
│   │   └── package.json
│   │
│   └── web/                      # React frontend
│       ├── src/
│       │   ├── pages/           # Route pages
│       │   ├── components/      # Reusable components
│       │   ├── hooks/           # React hooks (useAuth, queries)
│       │   ├── lib/             # Utilities
│       │   ├── App.tsx          # Main router
│       │   └── main.tsx         # Entry point
│       └── package.json
│
└── scripts/                      # Development utilities
    └── src/
```

## Demo Users

After database initialization, the following users are available:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| applicant@example.com | password123 | APPLICANT | Create and manage requests |
| reviewer@example.com | password123 | REVIEWER | Review and approve/reject requests |

### To Create Additional Users

Use the API's `/api/auth/register` endpoint or directly insert into the database:

```bash
psql -U ownership_dev -d beneficial_ownership_dev

INSERT INTO users (email, password_hash, role, created_at) VALUES
('newuser@example.com', 'hashed_password', 'APPLICANT', NOW());
```

## Available Scripts

### Root Level Commands

```bash
# Type check all packages
pnpm run typecheck

# Type check only lib packages
pnpm run typecheck:libs

# Build all packages
pnpm run build

# Run tests
pnpm run test
```

### API Server Commands

```bash
# Start development server with hot reload
pnpm --filter @workspace/api-server run dev

# Build for production
pnpm --filter @workspace/api-server run build

# Start production build
pnpm --filter @workspace/api-server run start

# Run tests
pnpm --filter @workspace/api-server run test

# Type check
pnpm --filter @workspace/api-server run typecheck
```

### Frontend Commands

```bash
# Start development server with Vite
pnpm --filter @workspace/web run dev

# Build for production
pnpm --filter @workspace/web run build

# Preview production build
pnpm --filter @workspace/web run preview

# Type check
pnpm --filter @workspace/web run typecheck
```

### Database Commands

```bash
# Push schema changes to database
pnpm --filter @workspace/db run push

# Generate migrations
pnpm --filter @workspace/db run generate

# Drop database (careful!)
pnpm --filter @workspace/db run drop
```

### API Spec Commands

```bash
# Regenerate Zod schemas and React Query hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Deployment

### Prerequisites for Deployment

- A server or hosting platform (AWS, Heroku, Vercel, Railway, Replit, etc.)
- PostgreSQL database (managed service recommended: AWS RDS, Supabase, Vercel Postgres, etc.)
- Node.js 24 runtime support
- Environment variable management system

### Deployment Options

#### Option 1: Heroku Deployment

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set SESSION_SECRET="your-production-secret"
heroku config:set NODE_ENV=production

# Deploy (from repo root)
git push heroku main

# Run database migrations
heroku run pnpm --filter @workspace/db run push
```

#### Option 2: Railway Deployment

1. Connect GitHub repository to [Railway.app](https://railway.app)
2. Add PostgreSQL plugin
3. Configure environment variables in Railway dashboard:
   - `DATABASE_URL` - Auto-set by Railway
   - `SESSION_SECRET` - Your production secret
   - `NODE_ENV` - Set to `production`
4. Add build/start commands:
   - Build: `pnpm install && pnpm run build`
   - Start: `pnpm --filter @workspace/api-server run start`

#### Option 3: AWS EC2 with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm run build

# Expose ports
EXPOSE 8080 22333

# Start both services
CMD ["sh", "-c", "pnpm --filter @workspace/api-server run start & pnpm --filter @workspace/web run preview"]
```

Build and deploy:

```bash
docker build -t request-approve .
docker tag request-approve:latest your-registry/request-approve:latest
docker push your-registry/request-approve:latest
```

#### Option 4: Vercel (Frontend Only) + Separate Backend

**Frontend on Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from artifacts/web directory
cd artifacts/web
vercel
```

**Backend on Railway/Heroku/AWS**
- Deploy API server separately as described above
- Update frontend `.env.production` with backend URL:
  ```
  VITE_API_URL=https://your-api.example.com
  ```

#### Option 5: Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: beneficial_ownership
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/beneficial_ownership
      SESSION_SECRET: ${SESSION_SECRET}
      NODE_ENV: production
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    environment:
      VITE_API_URL: http://api:8080
    ports:
      - "22333:22333"
    depends_on:
      - api

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Production Checklist

Before deploying to production:

- [ ] Change `SESSION_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Use a managed PostgreSQL service (AWS RDS, Supabase, etc.)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for your domain
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Configure database backups
- [ ] Set up monitoring and alerts
- [ ] Use environment-specific configuration
- [ ] Review API rate limiting
- [ ] Enable CSRF protection in production

### Production Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Security
SESSION_SECRET=your-production-jwt-secret-64-chars-minimum
NODE_ENV=production

# Server
API_PORT=8080
API_HOST=0.0.0.0

# CORS
CORS_ORIGIN=https://your-domain.com

# Optional monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## Environment Variables

### Development (`.env.local`)

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/beneficial_ownership_dev
SESSION_SECRET=dev-secret-change-in-production

# Optional
NODE_ENV=development
API_PORT=8080
LOG_LEVEL=debug
```

### Production (Deploy Platform Settings)

```bash
DATABASE_URL=<managed-postgres-url>
SESSION_SECRET=<strong-random-secret>
NODE_ENV=production
API_PORT=8080
LOG_LEVEL=info
CORS_ORIGIN=https://your-domain.com
```

## Troubleshooting

### Common Issues

#### 1. **Database Connection Error**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Verify PostgreSQL is running: `sudo service postgresql status`
- Check DATABASE_URL is correct
- Ensure database exists: `psql -l`
- Verify user permissions

#### 2. **Port Already in Use**

```
Error: listen EADDRINUSE: address already in use :::8080
```

**Solution:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or use a different port
API_PORT=3001 pnpm --filter @workspace/api-server run dev
```

#### 3. **pnpm Command Not Found**

```bash
npm install -g pnpm
pnpm --version
```

#### 4. **Dependency Installation Issues**

```bash
# Clear cache and reinstall
pnpm store prune
pnpm install --force
```

#### 5. **TypeScript Errors After Changing Schemas**

```bash
# Regenerate types from OpenAPI
pnpm --filter @workspace/api-spec run codegen

# Clear build cache
pnpm run clean

# Rebuild
pnpm run build
```

#### 6. **Authentication Token Issues**

- Ensure `SESSION_SECRET` is set and matches between deploys
- Check token expiration: tokens expire after 24 hours
- Verify JWT payload in browser DevTools → Application → Cookies

#### 7. **File Upload Failures**

- Ensure `uploads/` directory exists and has write permissions
- Check available disk space
- Verify `multer` configuration in `artifacts/api-server/src/routes/upload.ts`

### Debug Mode

Enable verbose logging:

```bash
LOG_LEVEL=debug pnpm --filter @workspace/api-server run dev
```

### Database Inspection

```bash
# Connect to database
psql -U ownership_dev -d beneficial_ownership_dev

# View all tables
\dt

# View table structure
\d applications

# Check for errors in migrations
SELECT * FROM drizzle_migrations_journal;
```

## Contributing

1. Create a feature branch
2. Make your changes and ensure type checking passes:
   ```bash
   pnpm run typecheck
   ```
3. Test locally on both frontend and backend
4. Submit a pull request

## License

MIT

## Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/YambwaImwaka/Request-Approve/issues)
- Check the [replit.md](./replit.md) for additional architecture details
