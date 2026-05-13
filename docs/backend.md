# Backend Overview

## Purpose
The API serves marketplace data, authentication, and booking workflows for customers, advertisers, and admins.

## Entry Point
- apps/api/src/server.ts initializes Express, middleware, and routes.

## Main Areas
- src/routes/apiRoutes.ts: HTTP routes for auth, products, bookings, and dashboards.
- src/services/rentoService.ts: business logic and Prisma queries.
- src/middleware/*: auth, request logging, rate limiting, and error handling.
- src/validators/schemas.ts: request validation helpers.
- prisma/schema.prisma: database models and enums.
- prisma/seed.ts: demo data for local development.

## Environment
- apps/api/.env: DATABASE_URL and admin seed credentials.

## Local Run
- npm run db:generate
- npm run db:push
- npm run db:seed
- npm run dev:api
