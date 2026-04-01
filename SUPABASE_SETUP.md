# KMPL Supabase Setup (Cross-Device)

## 1) Run SQL schema in Supabase
Open Supabase SQL Editor and run `supabase-schema.sql` from this repo.

## 2) Configure env vars
Set these in local `.env.local` and Netlify Site Settings -> Environment Variables:

- `NEXT_PUBLIC_APP_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`

## 3) Netlify build settings
- Build command: `npm run build`
- Publish directory: `.next`
- Keep `@netlify/plugin-nextjs` enabled.

## 4) Security notes
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if shared publicly.
- Use a strong random `AUTH_SECRET` in production.
- Service role key must never be exposed in client code.

## 5) Default super admin
If DB has no admin, app auto-seeds:
- Identity: `7981067942`
- Password: `Admin@123`

Change it after first login from Super Admin dashboard.
