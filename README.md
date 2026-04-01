# Rento

Rento is a two-sided rental marketplace:

- Consumers can browse rental products, compare pricing, and book items for short-term use.
- Advertisers can create login credentials, wait for approval, and then manage pricing and rental activity.
- Admin can monitor advertiser registrations and grant or suspend access from the dashboard.

## Suggested stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with Prisma ORM
- File storage for production: Cloudinary or S3
- Payments for production: Razorpay or Stripe

This starter includes:

- A landing page tailored to your rental-first concept
- Consumer view, advertiser auth flow, and admin dashboard
- A backend API with PostgreSQL-backed marketplace and access-control data
- Clear folder structure for future scaling

## Project structure

```text
apps/
  api/   Express backend
  web/   React frontend
```

## Core product modules

1. Authentication and profiles
2. Product listings and categories
3. Availability calendar and rental duration
4. Orders and booking lifecycle
5. Host pricing and payout tracking
6. Ratings, condition checks, and trust signals

## Recommended database schema

- `users`
- `profiles`
- `products`
- `product_images`
- `categories`
- `inventories`
- `availability_blocks`
- `orders`
- `payments`
- `reviews`

## Database setup

1. Copy `apps/api/.env.example` to `apps/api/.env`
2. Update `DATABASE_URL` with your PostgreSQL username, password, host, and database
3. Create the database if it does not already exist, for example `public_domain_inventory`
4. Push the Prisma schema:

```bash
npm run db:push
```

5. Seed the starter rental inventory:

```bash
npm run db:seed
```

## Login flow

- Advertiser login is email and password based
- New advertiser accounts start as `PENDING`
- Admin must change them to `APPROVED` before advertiser login succeeds
- Default seeded admin login:
  - Email: `admin@rento.local`
  - Password: `Admin@12345`

## Admin abilities

- Review all advertiser registrations
- Approve selected advertiser login IDs
- Move accounts back to pending
- Suspend access for selected advertiser login IDs

## Local run

1. Install dependencies:

```bash
npm install
```

2. Start the backend:

```bash
npm run dev:api
```

3. Start the frontend:

```bash
npm run dev:web
```

## Feature roadmap

- Add auth for renter and advertiser roles
- Add real-time booking state and notifications
- Add payment gateway and security deposit flow
- Add image upload, moderation, and product verification
