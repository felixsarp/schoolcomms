# SchoolComms

A web platform for school staff to manage class-based parent communications
(replacing manually-maintained WhatsApp groups) and, once connected, send
messages to parents via the WhatsApp Business Platform.

This is the **initial build**: full app structure, auth, class + parent
contact management, and a message composer UI — with the WhatsApp send
step **stubbed out** (logged, not actually sent). No WhatsApp API keys are
required to run or demo this version.

## Why "classes" instead of "WhatsApp groups"

The official WhatsApp Business Platform (Cloud API) does not provide a way
for a third-party app to create WhatsApp groups or add/remove members from
one — that's a personal-app-only concept. What the Business API *does*
support is sending template/text/media messages to individual phone numbers
that have opted in.

So this app models a "class" as a **managed distribution list** of parent
phone numbers. Staff add/remove parents from a class the same way they do
today in WhatsApp, but "sending to the class" becomes "send this message to
every parent currently in the list" via the Business API, individually.
Functionally this replaces the manual group-membership churn (the actual
pain point) without depending on group-management capability that doesn't
exist in the API.

## Stack

- **Backend**: Node.js + Express, JWT auth, Postgres storage via `pg`
  against `DATABASE_URL` (a Supabase Postgres project; tables are created
  automatically on first request — see `server/src/config/db.js`).
- **Frontend**: React + Vite, plain CSS (no framework lock-in).
- **File uploads**: `multer` (in-memory) → `@vercel/blob` in production;
  falls back to local disk under `server/uploads/` when no Blob token is
  configured, so local dev doesn't require Blob storage.
- **Deployment**: Vercel. `api/index.js` wraps the Express app as a single
  serverless function; the client is built as a static site. See
  `vercel.json`.

## Project layout

```
schoolcomms/
  api/
    index.js            Vercel serverless entry (wraps server/src/app.js)
  server/               Express API
    src/
      app.js            Express app (routes, middleware) - no app.listen()
      index.js           local dev entry point - calls app.listen()
      config/           Postgres client + schema setup
      middleware/       auth guard
      routes/           auth, classes, parents, messages
      services/         whatsappService.js  <-- stub lives here
      utils/            seeding, helpers
    uploads/            local-dev-only uploaded media fallback
  client/               React app (Vite)
    src/
      pages/            Login, Dashboard, ClassDetail
      components/       ParentList, MessageComposer, etc.
      api/              fetch wrapper
  vercel.json           build + rewrite config
  package.json          root deps for the api/ function
```

## Running locally

You need a Postgres database for local dev too (tables are created for you
on first request — no migration step). Create a free project at
[supabase.com](https://supabase.com), then grab its connection string from
Project Settings → Database → Connection string (see the comment in
`server/.env.example` for which one to use).

### 1. Backend

```bash
cd server
cp .env.example .env   # then fill in DATABASE_URL
npm install
npm run seed     # creates the first staff login
npm run dev      # http://localhost:4000
```

Default seeded login (change immediately, see `.env`):
- email: `admin@school.test`
- password: `ChangeMe123!`

### 2. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev       # http://localhost:5173
```

The client proxies API calls to `http://localhost:4000` by default (see
`client/.env.example`).

## Deploying to Vercel

1. Import the repo into Vercel. It auto-detects `vercel.json`
   (client build + `/api` serverless function) — no extra project
   settings needed.
2. Create a Supabase project at [supabase.com](https://supabase.com) (or
   reuse your local-dev one). Under Project Settings → Database →
   Connection string, copy the **Transaction pooler** string (port 6543,
   `?pgbouncer=true`) — not the direct connection — since serverless
   functions open a fresh connection per invocation and would otherwise
   exhaust Supabase's direct-connection limit. Set it as `DATABASE_URL`
   under Vercel Project Settings → Environment Variables.
3. **Storage tab → Create Database → Blob** → Connect to Project. This
   injects `BLOB_READ_WRITE_TOKEN`, needed because Vercel's production
   filesystem is read-only (local-disk uploads only work in dev).
4. Add the remaining env vars from `server/.env.example` under
   Project Settings → Environment Variables: `JWT_SECRET` (a long random
   string), `JWT_EXPIRES_IN`, and the seed admin vars if you want to run
   `npm run seed` against the production database (`vercel env pull` first,
   then run it locally against that `DATABASE_URL`).
5. Redeploy. `CLIENT_ORIGIN` isn't needed in production since the client
   and API share one origin.

## What's already wired up

- Staff login (JWT-based sessions)
- Create / rename / delete classes
- Add / edit / remove parents within a class
- Move a parent from one class to another (e.g. promotion to next grade)
- Compose and "send" a message (text, image, video, or document) to every
  parent in a class — currently logged to console + saved with status
  `queued (mock)` instead of actually calling WhatsApp
- Message history per class

## What's intentionally NOT done yet (by request — "no API connections yet")

- Real WhatsApp Business Platform (Cloud API) integration — see
  `server/src/services/whatsappService.js`. Every function there has a
  clear TODO and a matching real-API sketch in a comment.
- Parent opt-in / consent tracking flow (WhatsApp requires recipients to
  have opted in before you can message them outside a 24h reply window,
  and outbound-initiated messages must use pre-approved "template"
  messages — worth designing deliberately once you're ready to connect
  the real API).

## Next steps when you're ready to connect WhatsApp

1. Create a Meta developer app + WhatsApp Business Platform account,
   verify a business, and get a phone number ID + permanent access token.
2. Fill in `server/.env` (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`).
3. Replace the mock bodies in `whatsappService.js` with real `fetch` calls
   to `https://graph.facebook.com/vXX.X/{phone-number-id}/messages` —
   the function signatures and call sites elsewhere in the app won't
   need to change.
4. Design your message templates in Meta Business Manager and get them
   approved before relying on outbound-initiated sends.
