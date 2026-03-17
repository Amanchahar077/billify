# Billify Backend

REST API for authentication, customers, products, invoices, and reporting.

## Setup
1. `cd server`
2. Copy `.env.example` to `.env`
3. `npm install`
4. `npm run dev`

## API Overview
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`

- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/customers/:id`
- `PUT /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`

- `GET /api/v1/products`
- `POST /api/v1/products`
- `PUT /api/v1/products/:id`
- `DELETE /api/v1/products/:id`

- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `PATCH /api/v1/invoices/:id/status`
- `DELETE /api/v1/invoices/:id`

- `GET /api/v1/reports/summary`
- `GET /api/v1/reports/customers.csv`
