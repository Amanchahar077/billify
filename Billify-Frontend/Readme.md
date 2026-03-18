# Billify Frontend (React)

React + Vite frontend for Billify.

## Structure
- `src/app` core app logic, API helpers
- `src/styles` global styling
- `src/main.jsx` app entry

## Setup
1. `cd client`
2. Copy `.env.example` to `.env` if needed
3. `npm install`
4. `npm run dev`

API default: `http://127.0.0.1:5000/api/v1`

## Deploy On Vercel
1. Push this repository to GitHub.
2. In Vercel, import the repo.
3. Set the project Root Directory to `Billify-Frontend/client`.
4. Add the environment variable `VITE_API_BASE` with your Render backend URL, for example `https://your-backend-service.onrender.com/api/v1`.
5. Deploy the project.

## Notes
- The included `vercel.json` rewrites all routes to `index.html`, which keeps the app ready for client-side routing.
- After deployment, make sure your backend `CORS_ORIGIN` on Render is set to your Vercel frontend domain.
