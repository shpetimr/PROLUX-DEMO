# Production Deployment Preparation

Target stack:

- Frontend: Netlify web app
- Backend: Railway public ASP.NET Core API
- Database: Supabase PostgreSQL

Do not put database, PostgreSQL, or Supabase credentials in `frontend/.env`.
The frontend only needs the public backend API URL.

## Netlify frontend

Use the repository root with the included `netlify.toml`.

- Base directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `build`
- Required production variable:

```env
REACT_APP_API_URL=https://<railway-backend-domain>/api
```

The production build guard fails Netlify production builds with a clear message
when `REACT_APP_API_URL` is missing, not HTTPS, points to localhost or a private
network, includes credentials/query/hash values, or does not end with `/api`.

During Netlify builds, the frontend writes `build/_redirects` from
`REACT_APP_API_URL` so `/api/*` proxies to the configured Railway backend
without hardcoding a production URL in the repository. On Netlify production
hosts, the frontend automatically uses this same-origin `/api` path to avoid
browser CORS failures.

## Railway backend

Deploy the backend as a separate Railway service. Set Railway's service root
directory to `/backend` and use `/backend/railway.toml` as the config file if
Railway asks for the config path.

Railway injects `PORT`; the backend binds to `0.0.0.0:$PORT` when no explicit
`ASPNETCORE_URLS` or `PROLUX_BACKEND_*` bind URL is configured.

Required runtime variables:

```env
ASPNETCORE_ENVIRONMENT=Production
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
JWT_KEY=replace-with-43-plus-character-random-secret
JWT_ISSUER=PROLUX.Backend
JWT_AUDIENCE=PROLUX.Web
CORS_ALLOWED_ORIGINS=https://<netlify-site-domain>
```

`CORS_ALLOWED_ORIGINS` must be the frontend origin only: scheme and host, no
`/api`, no hash route, and no page path.

One-time admin provisioning variables:

```env
ADMIN_USERNAME=prolux-admin
ADMIN_FULL_NAME=PROLUX Administrator
ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

## Local development

Frontend:

```env
PORT=3000
PROLUX_FRONTEND_SCHEME=http
PROLUX_FRONTEND_HOST=localhost
PROLUX_FRONTEND_DEV_URL=${PROLUX_FRONTEND_SCHEME}://${PROLUX_FRONTEND_HOST}:${PORT}
PROLUX_BACKEND_SCHEME=http
PROLUX_BACKEND_HOST=localhost
PROLUX_BACKEND_PORT=5000
PROLUX_BACKEND_MAX_PORT=5010
PROLUX_BACKEND_ORIGIN=${PROLUX_BACKEND_SCHEME}://${PROLUX_BACKEND_HOST}:${PROLUX_BACKEND_PORT}
PROLUX_API_PATH=/api
PROLUX_API_BASE_URL=${PROLUX_BACKEND_ORIGIN}${PROLUX_API_PATH}
PROLUX_BACKEND_MODE=bundled
REACT_APP_BACKEND_SCHEME=${PROLUX_BACKEND_SCHEME}
REACT_APP_BACKEND_HOST=${PROLUX_BACKEND_HOST}
REACT_APP_BACKEND_PORT=${PROLUX_BACKEND_PORT}
REACT_APP_API_PATH=${PROLUX_API_PATH}
REACT_APP_API_URL=${PROLUX_API_BASE_URL}
```

Backend:

```env
ASPNETCORE_ENVIRONMENT=Development
PROLUX_BACKEND_SCHEME=http
PROLUX_BACKEND_HOST=localhost
PROLUX_BACKEND_PORT=5000
PROLUX_FRONTEND_SCHEME=http
PROLUX_FRONTEND_HOST=localhost
PROLUX_FRONTEND_PORT=3000
ASPNETCORE_URLS=${PROLUX_BACKEND_SCHEME}://${PROLUX_BACKEND_HOST}:${PROLUX_BACKEND_PORT}
CORS_ALLOWED_ORIGINS=${PROLUX_FRONTEND_SCHEME}://${PROLUX_FRONTEND_HOST}:${PROLUX_FRONTEND_PORT}
DATABASE_PROVIDER=sqlite
SQLITE_CONNECTION_STRING=Data Source=BusinessManagement.db
JWT_KEY=replace-with-a-long-random-secret
JWT_ISSUER=BusinessManagementAPI
JWT_AUDIENCE=BusinessManagementClient
ADMIN_USERNAME=prolux-admin
ADMIN_FULL_NAME=PROLUX Administrator
ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

## .NET version

The backend targets `net8.0`, a supported .NET LTS release. Keep
`backend/Dockerfile` on the same SDK and ASP.NET runtime major version when
upgrading in the future.
