# Mart - Fullstack E-Commerce Platform

Mart is a modern, high-performance, and scalable fullstack e-commerce platform built using a monorepo architecture with [Turborepo](https://turbo.build/) and [pnpm workspaces](https://pnpm.io/workspaces). The project features a robust Express API and a dynamic React frontend.

## ✨ Key Features
- **Modern E-Commerce Experience:** Fast, responsive, and accessible UI.
- **Real-Time Capabilities:** Socket.io integration for live updates and notifications.
- **Robust Authentication:** Secure JWT-based auth flow with password hashing.
- **Geospatial Features:** Integrated mapping capabilities using Leaflet.
- **Utility Services:** Built-in PDF generation and email service support.

## 🚀 Technology Stack

### Core / Workspace
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Monorepo Management:** [Turborepo](https://turbo.build/)
- **Language:** TypeScript across the entire stack

### Frontend (`apps/web`)
- **Framework:** React + Vite
- **Styling & UI:** Tailwind CSS, Radix UI Primitives, `framer-motion` for animations, Lucide React icons
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) for global state, [TanStack React Query](https://tanstack.com/query) for data fetching and caching
- **Routing:** [wouter](https://github.com/molefrog/wouter)
- **Forms & Validation:** React Hook Form + Zod
- **Real-time:** `socket.io-client`
- **Mapping:** Leaflet for geospatial features

### Backend (`apps/api`)
- **Server:** Node.js + Express v5
- **Database & ORM:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** JWT, `bcryptjs` for secure password hashing
- **Real-time:** `socket.io`
- **Logging:** Pino (with `pino-http` and `esbuild-plugin-pino`)
- **Utilities:** `nodemailer` for email, `pdfkit` for document generation, `web-push` for notifications
- **Security:** Helmet, express-rate-limit, cors, xss

### Shared Packages (`packages/`)
- `@workspace/database`: Shared database schemas and Drizzle client configuration.
- `@workspace/validation`: Zod schemas for shared input validation across frontend and backend.
- `@workspace/api-spec`: API contracts and route typings.
- `@workspace/api-client`: Pre-configured client utilities for the frontend to interact with the backend safely.

### Infrastructure & Deployment
- **Docker & Docker Compose:** Containerized environments for API, Web, and PostgreSQL.

---

## 📁 Project Structure

```text
mart/
├── apps/
│   ├── api/            # Express backend service
│   ├── web/            # Vite/React frontend application
│   └── sandbox/        # Internal testing or prototyping environment
├── packages/
│   ├── api-client/     # Shared API client methods
│   ├── api-spec/       # Shared API route specs & types
│   ├── database/       # Drizzle schema, migrations, and db client
│   └── validation/     # Zod validation schemas
├── docker-compose.yml  # Docker orchestration for local / production environments
├── turbo.json          # Turborepo task pipeline configuration
└── pnpm-workspace.yaml # pnpm workspaces configuration
```

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [pnpm](https://pnpm.io/installation) (v9+ recommended)
- [Docker & Docker Compose](https://www.docker.com/) (if running infrastructure via containers)

### 1. Installation
Clone the repository and install dependencies from the root directory:
```bash
git clone <repository-url>
cd mart
pnpm install
```

### 2. Environment Variables Setup
Create `.env` files in the respective directories (`apps/api/.env`, `apps/web/.env`) using the provided `.env.example` templates (if available). 

> **Note:** Do not commit your `.env` files. Required variables include `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, and any mailing or external API keys. Make sure to generate strong, random strings (at least 32 characters) for secrets.

**Example `apps/api/.env` structure:**
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | API server port | `5000` |
| `DATABASE_URL` | Postgres connection string | `postgres://user:pass@localhost:5432/mart` |
| `SESSION_SECRET`| Random >=32 char string | `your-super-secret-key-xyz` |
| `JWT_SECRET` | Secret for token signing | `another-super-secret-key` |
| `ALLOWED_ORIGIN`| Frontend URL for CORS | `http://localhost:3000` |

### 3. Database Initialization & Migrations
You can spin up a local PostgreSQL instance using Docker Compose:
```bash
docker-compose up -d postgres
```

The database schema and migrations are managed via [Drizzle ORM](https://orm.drizzle.team/) in the `@workspace/database` package. 
From the `packages/database` directory, you can run:
- `pnpm run generate` — Generates migration files based on schema changes.
- `pnpm run migrate` — Runs the migrations against the database.
- `pnpm run push` — Directly pushes schema changes to the database (useful for rapid local dev).

### 4. Running the Development Server
To start all applications (API + Web) concurrently with hot-reloading:
```bash
pnpm run dev
```
- **API Server** will be available at `http://localhost:5000`
- **Web App** will be available at `http://localhost:3000`

---

## 🐋 Docker Orchestration

The project includes a `docker-compose.yml` for seamless deployment or testing of the full stack. It provisions three services:

1. `postgres`: Alpine-based PostgreSQL 15 database.
2. `api`: Containerized Node.js Express backend.
3. `web`: Containerized frontend built and served.

**Start the full stack with Docker:**
```bash
docker-compose up --build
```
> Make sure environment variables are properly passed to your docker-compose or present in the `.env` at the root/context directory as specified in the compose file.

---

## 📜 Available Scripts

Run these scripts from the **root** of the monorepo:

- `pnpm run dev` — Starts both `api` and `web` in development mode.
- `pnpm run build` — Builds all packages and apps inside the workspace.
- `pnpm run typecheck` — Runs TypeScript type-checking across the workspace.

### App-Specific Scripts

**API (`apps/api`):**
- `pnpm run test` — Runs backend unit/integration tests using Vitest.

**Database (`packages/database`):**
- `pnpm run generate` / `migrate` / `push` — Drizzle ORM management scripts.

---

## 🔐 Security Best Practices (Reminder)
- **Secrets & Keys:** Ensure secrets (`SESSION_SECRET`, `JWT_SECRET`, database passwords) are supplied securely via environment variables and never hardcoded or committed to version control.
- **Git History Secrets Warning:** ⚠️ **CRITICAL:** If any secrets were previously hardcoded in your source code while testing, you must rotate them immediately before deploying to production. Those old values still exist in your Git history and could be compromised.
- **CORS & Origins:** Verify that `ALLOWED_ORIGIN` is configured accurately in production to prevent unauthorized access.
- **Trust Proxy:** If deployed behind a reverse proxy (like Nginx or AWS ALB), set `TRUST_PROXY=1` in the API environment to ensure rate limiting operates correctly on client IP addresses.

---

## 📄 License
This project is licensed under the MIT License - see the `package.json` for details.
