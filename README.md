# Rento

Rento is a two-sided rental marketplace:

- Consumers can browse rental products, compare pricing, and book items for short-term use.
- Advertisers can create login credentials, wait for approval, and then manage pricing and rental activity.
- Admin can monitor advertiser registrations and grant or suspend access from the dashboard.

#Why Rento? 

- In today's world, people make the most of rented products, giving them a sense of ownership to enhance the overall experience we need to provide them. This sense of ownership leads to greater engagement and better care for the product. The more people engage, the better the product is utilized and maintained.
- So to counter it, we can't keep names which make sense for **rentals**
- In this fast-moving atmosphere, no one is buying their flats. They all seemed to renting them out.
- People look for temporary solutions rather than buy the items as permanent solutions.
- Buying them costs more and makes it more tedious to take all the items when they move out from one city to another.
- Some people wish to keep some items, such as antiques or wedding lehengas. But buying a wedding lehenga or any antique would cost more, so why not rent them for their ceremony?
- For people who don't earn more but wish to keep some domestic items with them, rentals can help them, by providing low-cost rentals to them.
- We can also expand the business into the apparel section since influencers often buy dresses from e-commerce sites. However, they receive them a day later, wear them once, and then return the apparel to the e-commerce company.
- This process involves the cost of both delivery and returns. Additionally, you must pay the full amount upfront and then wait 2-3 days for the refund to be credited back to your account.
- We can counter this by offering rentals at the lowest price, allowing influencers to get the product quickly and easily. This eliminates return and packaging fees—just rent it, use it for as long as needed
    

## 🏡 **PUBLIC DOMAIN INVENTORY**
- In this kind of inventory, we can make the application bilaterally:-
- 1. Consumer End
- This would be a simple engagement interface, in which people can look for their products, look for advertiser's locations, and can place an order through the application.
- 2. Advertiser’s End
- On this end, people can host their unused products of any kind. And can ask for their rental values as per the product check validations.

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

2. Configure environment variables:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

If you want a different local port setup, update:

- `apps/api/.env` → `PORT` and `WEB_ORIGIN`
- `apps/web/.env` → `VITE_PORT` and `VITE_API_BASE_URL`

3. Start the backend:

```bash
npm run dev:api
```

4. Start the frontend:

```bash
npm run dev:web
```

## Feature roadmap

- Add auth for renter and advertiser roles
- Add real-time booking state and notifications
- Add payment gateway and security deposit flow
- Add image upload, moderation, and product verification
