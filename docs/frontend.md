# Frontend Overview

## Purpose
The web client covers browsing, customer checkout, advertiser onboarding, and admin review flows.

## Entry Point
- apps/web/src/main.tsx renders the App into the root element.

## Main Areas
- src/App.tsx: route-driven UI and page composition for all roles.
- src/api.ts: API base URL, types, and request helpers.
- src/styles.css: global styles, theming, and layout.

## Environment
- VITE_API_BASE_URL (optional) overrides the API base URL; defaults to http://localhost:4000.

## Local Run
- npm run dev:web
