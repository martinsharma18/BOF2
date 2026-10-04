# Feedora

A Nepal-focused marketplace for requirements. Companies and individuals post what they need (how many people, budget, gender, location), and everyone else reacts and leaves feedback. It started from the sketches in `docs/sketches/`.

**Stack:** ASP.NET Core Web API (.NET 10) · EF Core 10 + PostgreSQL · ASP.NET Identity + JWT (rotating refresh tokens) · React 19 + TypeScript (Vite) · Tailwind CSS v4 · TanStack Query · React Hook Form + Zod · lucide icons

## Features

| Area | What's there |
|---|---|
| Public | Landing page, login, register as **Company** (User A) or **Individual** (User B), forgot-password placeholder |
| Feed | Infinite scroll, search (title, text, company, person), filter by type / province / district (filters live in the URL), skeleton loading |
| Posts | Create / edit / delete (confirm dialog), image upload with drag-and-drop, title, type, gender (Male / Female / Both), contact number, minimum number, maximum payment, province/district or "anywhere" |
| Engagement | 5 reactions with optimistic updates, feedback threads, share (copy link) |
| Profiles | Public profile with the user's posts; settings for profile, photo and password (changing the password signs out other devices) |
| Registration | One form with an **Individual / Company** radio; Company shows company name + company location. Address is **Province → District → Local level** (all 753 municipalities / rural municipalities). Individuals also give their **date of birth** |
| Inbox | A mail-style **Inbox** (individuals) separate from notifications: **invitations** from companies and every new **vacancy** from the super admin. List on the left, message on the right, mark read, delete |
| Invitations | Companies open **Invitations** in the sidebar, filter individuals by province / district / local level, gender and age, see how many people match, and send to their Inbox (max 10 invitations per company per day) |
| Vacancies | The super admin posts vacancies (Admin → Vacancies). Open ones show as a compact list in the right column; tap one for details |
| Applications | Only companies post. Individuals **Apply** (message + profile). Companies see the applicant's profile and contact details, chat per application, and **Hire** or **Decline**. **One application = one job = one payment:** Applied → Hired → the individual **Claims** an amount (up to the post's max pay) → the company either **Pays exactly that amount** (job closes) or **Declines the claim with a reason** (the individual fixes it and claims again). Paying requires a claim and can't happen twice |
| Notifications | Bell with unread badge (polled every 30s), notifications page; sent on apply, hire/decline, claim, claim declined, message, payment, withdrawal. Each shows who it is from with a **Company / Individual / Super Admin** label |
| Wallet | Individuals get payments in a wallet (left sidebar + `/wallet`), then **Cash withdraw** (bank/eSewa/Khalti, account or phone number, name) goes to the super admin, who verifies it and flags it **Done**, **Pending** or **Rejected** (the flag can be changed; the individual is notified) |
| Mobile | Phone-first layout: bottom bar per role (Individual: Feed, Applied, Inbox, Wallet; Company: Feed, Applicants, **+**, Invite) plus a **More** sheet for everything else. Dialogs open as bottom sheets, chat is full-height, inputs are 16px (no iOS zoom), safe areas respected, photos are shrunk in the browser before upload |
| Installable app (PWA) | `manifest.webmanifest` + `public/sw.js`: "Add to Home Screen" (install banner on Android, instructions on iPhone), opens full screen, app shell and images cached for slow/offline use, offline strip. The API is never cached |
| Phone notifications | Web Push: every new notification or inbox message is also pushed to the user's phones (Settings → Phone notifications, or the prompt on the Notifications page). Tapping opens the right page. Signing out unlinks the device. iPhone needs the app installed to the home screen (iOS 16.4+) |
| Admin (User C) | Stats overview, user search/filter with enable/disable, **ads manager** (image, link, placement, schedule) |
| Ads | Banner (between posts, 4:1, 1600 × 400 px) and Sidebar (square, 800 × 800 px) placements; the admin form previews the exact shape and warns when an image will be cropped. Empty spaces show an "Advertise here" slot |

## Project layout

```
backend/
  Feedora.Domain/          entities, enums, Nepal's provinces, districts and local levels
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

Dev super admin (User C, opens `/admin`): `admin@feedora.local` / `Admin12345` (from `appsettings.Development.json`).

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
POST /api/posts/{id}/applications                          (Individual; { kind: "Apply", message })
POST /api/applications/{id}/claim                          (accepted Individual; { amount, note })
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

Free hosting: **Vercel** (frontend) + **Render** (API, Docker) + **Neon** (PostgreSQL) + **Cloudinary** (photos).
Step-by-step guide: [DEPLOY.md](DEPLOY.md). Files: `render.yaml`, `backend/Dockerfile`, `frontend/vercel.json`.

Self-hosting on one server also works: build the frontend, copy `frontend/dist/*` into `backend/Feedora.Api/wwwroot/`,
and the API serves both from one origin (same environment variables as in DEPLOY.md).

## Next up

- Password reset and email verification (needs an email provider)
- Rename "Type 1 / Type 2" to their real meanings (one place: `frontend/src/features/posts/labels.ts`)
- Real payment gateway (eSewa / Khalti) so companies fund payments instead of just recording them
- Native app (React Native / Expo) only if the store listing or deeper phone features are needed; the API and the push backend are ready for it
- Brand name: the logo says BOF2 while copy says Feedora; change `APP_NAME` in `frontend/src/lib/brand.ts` and the `<title>` in `index.html`
- Reporting posts and moderation queue; automated tests (xUnit + Testcontainers, Vitest + Playwright)
