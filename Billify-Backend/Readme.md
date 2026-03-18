# Billify Backend

REST API for authentication, customers, products, invoices, and reporting.

## Setup
1. `cd server`
2. Copy `.env.example` to `.env`
3. `npm install`
4. `npm run dev`

## Deploy On Render
1. Push this repository to GitHub.
2. In Render, create a new Blueprint instance or Web Service from the repo.
3. If you use the included `render.yaml`, Render will automatically detect:
   - Root directory: `Billify-Backend/server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
4. Set the required environment values:
   - `MONGODB_URI`
   - `CORS_ORIGIN`
   - `JWT_ACCESS_SECRET` if you do not want Render to generate one
   - `JWT_REFRESH_SECRET` if you do not want Render to generate one
5. Deploy the service and confirm `https://your-service.onrender.com/api/health` returns success.

## Frontend Connection
- Set `VITE_API_BASE` in the frontend to `https://your-service.onrender.com/api/v1`
- Set backend `CORS_ORIGIN` to your frontend domain, for example `https://your-frontend.vercel.app`

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
