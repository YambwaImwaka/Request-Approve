# Request-Approve: Beneficial Ownership Change Request Workflow System

A production-quality full-stack web application that simulates a beneficial ownership information update workflow for compliance review. This system manages role-based request workflows with an immutable audit trail.

**🚀 Live Deployment**: https://request-approve-demo.replit.dev  
**Test Credentials**: 
- Applicant: `applicant@example.com` / `password123`
- Reviewer: `reviewer@example.com` / `password123`

## Table of Contents

- [Live Demo](#live-demo)
- [Quick Start (Local)](#quick-start-local)
- [AI Tools Disclosure](#ai-tools-disclosure)
- [Data Model](#data-model)
- [Design Decisions](#design-decisions)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Running Locally](#running-locally)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Trade-offs & Future Improvements](#trade-offs--future-improvements)
- [Troubleshooting](#troubleshooting)

---

## Live Demo

The application is deployed and ready to use at: **https://request-approve-demo.replit.dev**

### Demo Workflow

1. **Login as Applicant**: applicant@example.com / password123
   - Create new beneficial ownership change requests
   - Edit DRAFT applications
   - Submit for review
   - View reviewer feedback

2. **Login as Reviewer**: reviewer@example.com / password123
   - View submitted applications queue
   - Start review process
   - Approve, reject, or request changes (with comments)
   - View complete audit trail

---

## Quick Start (Local)

```bash
# Clone repository
git clone https://github.com/YambwaImwaka/Request-Approve.git
cd Request-Approve

# Install dependencies
pnpm install

# Configure database (see Database Setup section)
export DATABASE_URL="postgresql://user:password@localhost:5432/beneficial_ownership_dev"
export SESSION_SECRET="your-jwt-secret-here"

# Initialize database
pnpm --filter @workspace/db run push

# Terminal 1: Start API server
pnpm --filter @workspace/api-server run dev

# Terminal 2: Start frontend
pnpm --filter @workspace/web run dev

# Open http://localhost:22333
```

---

## AI Tools Disclosure

### AI Tools Used

1. **Replit AI** - Comprehensive project scaffolding and core architecture
2. **Claude Haiku 3.5** - Fine-tuning and specialized documentation
3. **GitHub Copilot** - Code completion and documentation assistance

### How AI Was Used

| Component | Tool | Purpose | Role |
|-----------|------|---------|------|
| **Project Scaffolding** | Replit AI | Monorepo structure, pnpm workspace, build setup | Generated |
| **Database Schema** | Replit AI | Drizzle ORM tables, relationships, enums | Generated |
| **Workflow State Machine** | Replit AI | Transition table, role-based validation logic | Generated |
| **React Components** | Replit AI | Forms, layouts, authentication UI | Generated |
| **Express Route Handlers** | Replit AI | CRUD endpoints, middleware, error handling | Generated |
| **Testing Strategy** | Replit AI | Vitest setup, test patterns, API tests | Generated |
| **Type Safety** | Replit AI | Zod schemas, TypeScript config, type inference | Generated |
| **Documentation** | Claude + Copilot | README structure, deployment guides, guides | Generated |
| **Code Comments** | GitHub Copilot | Inline documentation, function descriptions | Generated |

### What I Verified

I (the developer) personally reviewed and verified:

✅ **Database Layer**
- All schema definitions in `lib/db/src/schema/`
- Foreign key relationships and constraints
- Enum types and their values
- Migration and seeding logic

✅ **Workflow Logic**
- State transitions in `workflow.ts`
- Role-based permission enforcement
- Comment requirement rules
- Transition validation

✅ **API Security**
- JWT token generation and verification
- Password hashing with bcryptjs
- Authentication middleware
- Role-based access control on all endpoints

✅ **End-to-End Testing**
- Tested complete workflows as applicant and reviewer
- Verified audit trail creation on every transition
- Tested file uploads and attachments
- Tested error cases and invalid transitions
- Tested state machine prevents unauthorized transitions

✅ **Type Safety**
- All TypeScript interfaces and types
- Zod validation schemas
- React component prop types
- API request/response types

### AI-Generated Content

The following files were generated/scaffolded by AI with human verification:
- ✅ `lib/db/src/schema/*` - Database schemas
- ✅ `artifacts/api-server/src/routes/*` - Express endpoints
- ✅ `artifacts/api-server/src/lib/workflow.ts` - State machine
- ✅ `artifacts/web/src/components/*` - React components
- ✅ `artifacts/web/src/pages/*` - Page components
- ✅ `artifacts/web/src/hooks/*` - Custom React hooks
- ✅ `package.json` files - Dependencies and scripts
- ✅ `README.md` - This documentation
- ✅ `tsconfig.json` - TypeScript configuration

### Why AI Was Effective Here

1. **Scaffolding**: AI excels at creating boilerplate and project structure
2. **Type Generation**: Consistent type definitions across layers
3. **Route Patterns**: Repetitive CRUD endpoints follow clear patterns
4. **Component Templates**: Form components have predictable structure
5. **Configuration**: Build tools and TypeScript configs are formulaic
6. **Documentation**: AI can synthesize information into clear guides

### My Contributions (Human)

1. **Architecture Design** - Chose monorepo, OpenAPI-first, workflow state machine
2. **Business Logic Decisions** - Designed immutable audit trail, role enforcement
3. **Integration & Testing** - End-to-end testing of workflows, security verification
4. **Refinement** - Adjusted generated code for specific requirements
5. **Deployment** - Set up and tested Replit deployment
6. **Documentation** - Verified all docs, added trade-offs and insights

---

## Data Model

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,  -- ENUM: APPLICANT | REVIEWER
  created_at TIMESTAMP WITH TIMEZONE NOT NULL DEFAULT NOW()
);
```

**Design Rationale:**
- Email as unique identifier for authentication
- Password hash using bcryptjs (never store plain text)
- Role enum ensures type safety at database level
- Timestamp tracks user registration for audit purposes

#### Applications Table
```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category application_category NOT NULL,  -- ENUM: ownership change types
  company_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  beneficial_owner_name TEXT NOT NULL,
  ownership_percentage NUMERIC(5,2) NOT NULL,  -- 0-100, stored as numeric
  effective_date DATE,
  change_reason TEXT NOT NULL,
  supporting_notes TEXT,
  attachment_name TEXT,
  attachment_url TEXT,
  status application_status NOT NULL,  -- ENUM: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED/CHANGES_REQUESTED
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIMEZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIMEZONE NOT NULL DEFAULT NOW()
);
```

**Design Rationale:**
- All required fields marked NOT NULL to enforce data quality
- `ownership_percentage` stored as NUMERIC for precision (avoids floating-point errors)
- Status enum enforces valid workflow states at database level
- `user_id` foreign key ensures referential integrity
- Timestamps track creation and last modification
- Optional attachment fields allow flexible file support

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_role user_role NOT NULL,  -- Denormalized role for historical accuracy
  previous_status application_status NOT NULL,
  new_status application_status NOT NULL,
  comment TEXT,  -- Optional reason for state transition
  timestamp TIMESTAMP WITH TIMEZONE NOT NULL DEFAULT NOW()
);
```

**Design Rationale:**
- **Immutable by design**: No UPDATE/DELETE operations on audit logs
- **Denormalized user_role**: Stores role at time of action (accounts for role changes)
- **Complete history**: Tracks every workflow transition
- **Enables compliance**: Required for regulatory audit trails
- **Queryable history**: Foreign keys allow joining with users/applications for reporting

### ER Diagram

```
┌─────────────────────────┐
│       USERS             │
├─────────────────────────┤
│ id (PK)                 │
│ email (UNIQUE)          │
│ password_hash           │
│ role (ENUM)             │ ◄────────────┐
│ created_at              │              │
└─────────────────────────┘              │
           ▲                              │
           │                              │
        1:N │                              │
           │                              │
┌─────────────────────────────────────────────────────────┐
│         APPLICATIONS                                    │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ title, category, company_name, registration_number     │
│ beneficial_owner_name, ownership_percentage             │
│ effective_date, change_reason, supporting_notes         │
│ attachment_name, attachment_url                         │
│ status (ENUM: workflow states)                          │
│ user_id (FK → users.id)                                 │ ──────┐
│ created_at, updated_at                                  │       │
└─────────────────────────────────────────────────────────┘       │
           ▲                                                        │
           │                                                        │
        1:N │                                                        │
           │                                                        │
┌─────────────────────────────────────────────────────────────┐    │
│         AUDIT_LOGS                                          │    │
├─────────────────────────────────────────────────────────────┤    │
│ id (PK)                                                     │    │
│ application_id (FK → applications.id)                       │    │
│ user_id (FK → users.id) ────────────────────────────────────┘    │
│ user_role (denormalized at time of action)                  │
│ previous_status, new_status (ENUM)                          │
│ comment (optional)                                          │
│ timestamp (immutable, NOT UPDATABLE)                        │
└─────────────────────────────────────────────────────────────┘
```

### Enums

**user_role**
- `APPLICANT` - Creates and manages applications
- `REVIEWER` - Reviews and approves/rejects applications

**application_status**
- `DRAFT` - Initial state, applicant editing
- `SUBMITTED` - Ready for review, awaiting reviewer
- `UNDER_REVIEW` - Reviewer actively reviewing
- `APPROVED` - Approved by reviewer
- `REJECTED` - Rejected by reviewer (final state)
- `CHANGES_REQUESTED` - Reviewer requesting modifications (transitions back to DRAFT)

**application_category**
- `OWNERSHIP_TRANSFER` - Transfer of ownership between parties
- `PERCENTAGE_CHANGE` - Change in ownership percentage
- `NEW_BENEFICIAL_OWNER` - Adding a new beneficial owner
- `REMOVAL_OF_BENEFICIAL_OWNER` - Removing an existing beneficial owner
- `CORRECTION_AMENDMENT` - Correcting or amending existing information

---

## Design Decisions

### 1. OpenAPI-First Architecture

**Decision**: Define all API contracts in OpenAPI 3.1 YAML, then code-generate everything else.

**Rationale**:
- Single source of truth for API contracts
- Automatic type safety across frontend/backend
- Enables automatic Zod schema generation
- Facilitates API documentation and client SDK generation
- Reduces type mismatches and bugs

**Trade-off**: Requires workflow discipline; schema changes need regeneration

---

### 2. Workflow State Machine (Centralized, Pure Function)

**Decision**: All state transitions validated through a pure function (`workflow.ts`) with a transition table.

```typescript
// Example: Transition rules enforced in code
const TRANSITIONS = {
  DRAFT: { SUBMITTED: "APPLICANT" },
  SUBMITTED: { UNDER_REVIEW: "REVIEWER" },
  UNDER_REVIEW: {
    APPROVED: "REVIEWER",
    REJECTED: "REVIEWER",
    CHANGES_REQUESTED: "REVIEWER"
  },
  CHANGES_REQUESTED: { DRAFT: "APPLICANT" }
};
```

**Rationale**:
- Prevents invalid state transitions at runtime
- Role-based authorization enforced at workflow level
- Easy to audit: all rules visible in one place
- Testable: pure function with no side effects
- Reusable: shared between API and (potentially) other services

**Trade-off**: Requires discipline to route all transitions through this validator

---

### 3. Immutable Audit Trail

**Decision**: Every workflow transition creates an audit log entry; audit logs are never updated or deleted.

**Rationale**:
- Regulatory compliance (FINRA, SEC requirements for beneficial ownership records)
- Non-repudiation: proves who did what and when
- Enables forensic analysis of decision-making
- Stored with denormalized `user_role` to capture role at time of action
- Comment field provides reasoning for transitions

**Implementation**:
- Audit logs INSERT-ONLY (no UPDATE/DELETE)
- Denormalized user info at time of action
- Timestamp on every entry
- Complete history queryable for reporting

---

### 4. Role-Based Access Control (Server-Side Only)

**Decision**: All authorization happens on the backend; frontend adapts UI based on role but never trusts it.

**Rationale**:
- Security: authorization can't be bypassed by client-side tampering
- Prevents unauthorized actions even if frontend is compromised
- Role stored in JWT payload, verified on every request
- Middleware enforces before reaching business logic

**Example**:
```typescript
// Backend always verifies role
router.post('/applications/:id/approve', 
  requireAuth,                    // Verify JWT
  requireRole('REVIEWER'),        // Enforce role
  approveApplication              // Business logic
);
```

---

### 5. TypeScript End-to-End

**Decision**: TypeScript for frontend, backend, and database layers (with Drizzle ORM for type-safe queries).

**Rationale**:
- Catches type errors at compile time, not runtime
- Shared types between frontend/backend prevent mismatches
- Database schema generates TypeScript types automatically
- IDE autocomplete and refactoring support
- Easier onboarding for future developers

---

### 6. Monorepo with pnpm Workspaces

**Decision**: Single repository with shared libraries (`lib/*`) and runnable artifacts (`artifacts/*`).

**Rationale**:
- Shared code (database schemas, API specs) stays in sync across services
- Database schema changes don't risk version mismatches
- Easier to coordinate changes across frontend/backend
- Single deployment unit

**Structure**:
- `lib/` - Shared, reusable packages (db schemas, API specs)
- `artifacts/` - Runnable applications (api-server, web)
- `scripts/` - Development utilities

---

### 7. PostgreSQL + Drizzle ORM (No Migration Files)

**Decision**: Use Drizzle ORM with schema-driven migrations instead of manual SQL files.

**Rationale**:
- Schema defined once in TypeScript
- Automatic migration generation
- Type-safe queries with full IDE support
- Avoids manual SQL maintenance burden

---

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

### Current Deployment: Replit

This project is currently deployed on **Replit** for demonstration purposes.

**Live URL**: https://request-approve-demo.replit.dev

**Why Replit?**
- One-click deployments from GitHub
- Built-in PostgreSQL support
- Environment variable management
- Automatic HTTPS
- No credit card required

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

## Trade-offs & Future Improvements

### Trade-offs Made

1. **State Machine Centralization**
   - ✅ Benefit: Single source of truth for all workflow rules
   - ❌ Trade-off: Requires discipline to always route transitions through validator
   - 💡 Alternative: Could add database constraints as backup enforcement

2. **OpenAPI-First (Code Generation)**
   - ✅ Benefit: Type safety, single source of truth
   - ❌ Trade-off: Extra regeneration step when API changes
   - 💡 Could automate: Add pre-commit hook to regenerate on spec changes

3. **JWT Tokens (Stateless Auth)**
   - ✅ Benefit: Scalable, no session storage needed
   - ❌ Trade-off: Can't revoke tokens instantly (24-hour expiry is compromise)
   - 💡 Future: Add token blacklist for real-time revocation

4. **File Uploads to Local Filesystem**
   - ✅ Benefit: Simple for development/demo
   - ❌ Trade-off: Not scalable to multiple servers
   - 💡 Production: Switch to S3 or cloud storage

5. **Monorepo (Single Repo)**
   - ✅ Benefit: Easier to coordinate changes, shared code stays in sync
   - ❌ Trade-off: Can't version packages independently
   - 💡 Future: Could split into separate repos with npm packages if needed

### Future Improvements (With More Time)

1. **Real-Time Updates**
   - Add WebSocket support for live application status updates
   - Implement notification system when applications are reviewed
   - **Effort**: Medium (1-2 days)

2. **Advanced Audit Features**
   - Generate compliance reports from audit logs
   - Timeline visualization of application history
   - Email notifications on status changes
   - **Effort**: Medium (1-2 days)

3. **File Attachments Enhancement**
   - Support for multiple file types (PDF, DOCX, images)
   - File virus scanning before upload
   - S3/Cloud storage integration instead of local filesystem
   - **Effort**: Medium (1 day)

4. **Pagination & Search**
   - Add pagination to applications list
   - Full-text search across applications
   - Filter by status, date range, owner
   - **Effort**: Low-Medium (1 day)

5. **Email Notifications**
   - Email applicants when reviewer requests changes
   - Email reviewers when new applications submitted
   - Email approvers with approval confirmation
   - **Effort**: Low (6 hours)

6. **Testing**
   - Unit tests for workflow state machine
   - Integration tests for API endpoints
   - E2E tests for complete workflows
   - **Effort**: Medium (1-2 days)

7. **Batch Operations**
   - Bulk approve/reject applications
   - Export applications to CSV/PDF
   - Import applications from external systems
   - **Effort**: Medium (1-2 days)

8. **Role Hierarchy**
   - Add ADMIN role for system management
   - Add AUDITOR role for compliance reviews
   - User management interface
   - **Effort**: Medium-High (1-2 days)

9. **Advanced Validation**
   - Company registration number verification against public registries
   - Beneficial owner identity verification
   - Ownership percentage validation (must sum to 100% for all owners)
   - **Effort**: High (2-3 days, requires external APIs)

10. **Performance Optimization**
    - Add caching layer (Redis) for frequently accessed data
    - Database query optimization with indexes
    - Frontend code splitting and lazy loading
    - **Effort**: Low-Medium (1-2 days)

---

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

---

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
