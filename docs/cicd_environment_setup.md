# CI/CD & Environment Setup

## Local Development
- Uses Docker Compose
- Database: PostgreSQL + TimescaleDB

## CI Pipeline
- Runs on feature branches and PRs
- Steps:
  - Install dependencies
  - Run tests
  - Run DB migrations
  - Build Docker image

## Branch Strategy
- Feature branches: development work
- Main branch: production-ready code

## Environments
- Dev
- Staging
- Production

## Pipelines
- Backend CI runs tests and builds docker image.
- Frontend CI installs deps, lints, builds.

## Database
Run SQL from /infrastructure/database_setup.sql to create:
- stock_screener_dev
- stock_screener_staging
- stock_screener_prod

## Use GitHub Secrets:
- DB_HOST_DEV
- DB_HOST_STAGING
- DB_HOST_PROD
- JWT_SECRET