# Documentation

Project documentation lives here.

## Repository layout

- `apps/` — deployable applications (`api`, `web`, `sandbox`)
- `packages/` — shared workspace packages (`database`, `api-client`, `validation`, `api-spec`)
- `infrastructure/` — deployment & ops config (docker, nginx, kubernetes, terraform, monitoring)
- `scripts/` — workspace maintenance & seeding scripts

## API environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Postgres connection string. |
| `SESSION_SECRET` | yes | — | JWT signing secret. In `production` it must be a random value of **≥ 32 chars**; weak/placeholder values are rejected at startup. |
| `PORT` | no | `5000` | API listen port. |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test`. |
| `ALLOWED_ORIGIN` | no | `http://localhost:3000` | Comma-separated CORS allowlist. |
| `TRUST_PROXY` | no | unset | Number of reverse proxies in front of the API (e.g. `1`). When unset the server does not trust `X-Forwarded-*`, preventing rate-limit bypass via spoofed IPs. |
| `LOG_LEVEL` | no | `info` | pino log level. |

## Continuous integration

`.github/workflows/ci.yml` runs typecheck + build, plus a `test` job that starts a
Postgres service, applies the schema (`@workspace/database push`), runs the
incremental migration, and executes the API test suite.
