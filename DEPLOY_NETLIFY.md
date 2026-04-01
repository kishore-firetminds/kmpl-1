# Netlify Deployment Guide

## 1) Push code to GitHub
Commit and push this project to your repository.

## 2) Create a Netlify site
- Netlify -> Add new site -> Import from Git
- Select this repository

## 3) Build settings
These are already defined in `netlify.toml`:
- Build command: `npm run build`
- Next.js runtime plugin: `@netlify/plugin-nextjs`
- Node version: `20`

## 4) Environment variables (Netlify UI)
Set in Site settings -> Environment variables:
- `NEXT_PUBLIC_APP_URL` = your site URL (example: `https://your-site.netlify.app`)
- `RAZORPAY_KEY_ID` = your Razorpay key id
- `RAZORPAY_KEY_SECRET` = your Razorpay key secret

## 5) Deploy
Trigger deploy from Netlify.

## 6) Verify after deploy
- Open `/register`
- Start payment flow
- Ensure Razorpay checkout opens and returns success/failure properly

## Notes
- Do not commit `.env.local`.
- Use Razorpay test keys in testing and live keys in production.
