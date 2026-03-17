# Billify

Billify is a full-stack billing and invoicing workspace for small teams. It focuses on a smooth customer ? invoice flow with a clean dashboard, reusable products, and exportable reports.

## Features
- Secure login and workspace profile
- Customer directory with quick search
- Product catalog for reusable line items
- Invoice builder with preview + print
- Monthly revenue summary and CSV export

## Tech Stack
- Backend: Node.js, Express, MongoDB
- Frontend: React + Vite

## Project Structure
- `Billify-Backend/server` – API, database models, authentication
- `Billify-Frontend/client` – React UI and dashboard

## Quick Start
1. Start the backend
   1. `cd Billify-Backend/server`
   2. Copy `.env.example` to `.env` and update values
   3. `npm install`
   4. `npm run dev`

2. Start the frontend
   1. `cd Billify-Frontend/client`
   2. Copy `.env.example` to `.env` if needed
   3. `npm install`
   4. `npm run dev`

The frontend runs on `http://127.0.0.1:5173` by default and connects to the API at `http://127.0.0.1:5000`.
