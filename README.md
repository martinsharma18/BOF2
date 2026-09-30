# Feedora

A Nepal-focused marketplace for requirements. Companies and individuals post what they need (how many people, budget, gender, location), and everyone else reacts and leaves feedback. It started from the sketches in `docs/sketches/`.

**Stack:** ASP.NET Core Web API (.NET 10) · EF Core 10 + PostgreSQL · ASP.NET Identity + JWT (rotating refresh tokens) · React 19 + TypeScript (Vite) · Tailwind CSS v4 · TanStack Query · React Hook Form + Zod · lucide icons

## Features

| Area | What's there |
|---|---|
| Public | Landing page, login, register as **Company** (User A) or **Individual** (User B), forgot-password placeholder |
| Feed | Infinite scroll, search (title, text, company, person), filter by type / province / district (filters live in the URL), skeleton loading |
| Posts | Create / edit / delete (confirm dialog), image upload with drag-and-drop, title, type, M/F, minimum number, maximum payment, province/district or "anywhere" |
| Engagement | 5 reactions with optimistic updates, feedback threads, share (copy link) |
| Profiles | Public profile with the user's posts; settings for profile, photo and password (changing the password signs out other devices) |
| Registration | One form with an **Individual / Company** radio; Company shows company name + company location |
| Applications | Only companies post. Individuals **Apply** (message + profile) or **Claim** (one tap). Companies see the applicant's profile and contact details, accept/decline, chat per application and **pay** accepted applicants |
| Notifications | Bell with unread badge (polled every 30s), notifications page; sent on apply, accept/decline, message, payment, withdrawal |
| Wallet | Individuals get payments in a wallet (left sidebar + `/wallet`), then **Cash withdraw** (bank/eSewa/Khalti, account number, name) goes to the admin, who pays it and marks it paid |
| Admin (User C) | Stats overview, user search/filter with enable/disable, **ads manager** (image, link, placement, schedule) |
| Ads | Banner (between posts) and Sidebar placements show live ads and fall back to an "Advertise here" slot |

## Project layout

```
backend/
  Feedora.Domain/          entities, enums, Nepal's provinces and districts
  Feedora.Application/     DTOs, validators, service interfaces (Auth, Posts, Reactions, Feedbacks, Users, Ads, Admin)
  Feedora.Infrastructure/  EF DbContext + migrations, Identity/JWT, service implementations, file storage
  Feedora.Api/             controllers, error handling, security headers, health check, SPA hosting
frontend/src/
  app/                     App providers + lazy-loaded router
  components/ui/           design system (Button, Form controls, Dialog, Menu, Toast, Card, Badge, Avatar…)
  components/layout/       AppShell (top bar, side nav, mobile bottom nav), AuthLayout, Logo
  features/                auth, posts, users, admin, ads, locations: API hooks + feature components
  pages/                   one file per route (auth/, admin/, feed, post, profile, settings…)
  hooks/ lib/              shared hooks, API client with token refresh, types, formatting
```

## Run locally

**1. Database connection** (kept out of git in user-secrets):

```bash
cd backend
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=feedora;Username=postgres;Password=YOUR_PASSWORD" --project Feedora.Api
```

Or use `docker compose up -d` for a Postgres on port 5433.

**2. API** runs on http://localhost:5000. On start it applies migrations and seeds roles and the admin account.

```bash
dotnet run --project Feedora.Api --launch-profile http
```

API reference (development only): http://localhost:5000/scalar · health check: http://localhost:5000/health

**3. Frontend** runs on http://localhost:5173 and proxies `/api` and `/uploads` to the API.

```bash
cd frontend && npm install && npm run dev
```

Dev admin: `admin@feedora.local` / `Admin12345` (from `appsettings.Development.json`).

## API

```
POST /api/auth/register/company | /register/individual | /login | /refresh | /logout | /change-password
GET  /api/auth/me
GET  /api/locations/provinces
GET  /api/posts?search=&type=&province=&district=&authorId=&page=&pageSize=
POST /api/posts                    PUT /api/posts/{id}    DELETE /api/posts/{id}     (multipart; image in "media")
PUT|DELETE /api/posts/{id}/reaction
GET|POST   /api/posts/{id}/feedback      DELETE /api/posts/feedback/{id}
GET  /api/users/{id}               GET|PUT /api/users/me   PUT|DELETE /api/users/me/avatar
POST /api/posts/{id}/applications                          (Individual; { kind: Apply|Claim, message })
GET  /api/applications?postId=&status=     GET /api/applications/{id}
PUT  /api/applications/{id}/status         POST /api/applications/{id}/payments      (Company)
GET|POST /api/applications/{id}/messages
GET  /api/notifications   GET /api/notifications/unread-count   POST /api/notifications/{id}/read | /read-all
GET  /api/wallet          POST /api/wallet/withdrawals            (Individual)
GET  /api/admin/withdrawals?status=        PUT /api/admin/withdrawals/{id}  ({ paid, note })
GET  /api/ads?placement=Banner|Sidebar
GET  /api/admin/stats              GET /api/admin/users    PUT /api/admin/users/{id}/status
GET|POST /api/admin/ads            PUT|DELETE /api/admin/ads/{id}
```

## Database changes

```bash
cd backend
dotnet ef migrations add <Name> -p Feedora.Infrastructure -s Feedora.Api -o Persistence/Migrations
```

## Deploying

1. `cd frontend && npm run build`, then copy `frontend/dist/*` into `backend/Feedora.Api/wwwroot/`. The API serves the SPA on the same origin, so no CORS setup is needed.
2. Set these environment variables: `ConnectionStrings__Default`, `Jwt__Key` (32+ random characters), `Seed__AdminEmail`, `Seed__AdminPassword`. Set `Cors__Origins__0` only if the frontend is hosted elsewhere.
3. Put it behind HTTPS (nginx, IIS, Azure, etc.). Forwarded headers are already trusted for real client IPs.
4. Uploaded files go to `Feedora.Api/uploads/`. Mount it as a persistent volume, or swap `LocalFileStorage` for S3, Azure Blob or Cloudinary behind `IFileStorage`.

## Next up

- Password reset and email verification (needs an email provider)
- Rename "Type 1 / Type 2" to their real meanings (one place: `frontend/src/features/posts/labels.ts`)
- Real payment gateway (eSewa / Khalti) so companies fund payments instead of just recording them
- Push notifications (SignalR / web push) instead of 30-second polling
- Brand name: the logo says BOF2 while copy says Feedora; change `APP_NAME` in `frontend/src/lib/brand.ts` and the `<title>` in `index.html`
- Reporting posts and moderation queue; automated tests (xUnit + Testcontainers, Vitest + Playwright)
