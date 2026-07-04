# Next.js + Supabase + Prisma Template

[![CI](https://github.com/DimitriTedom/NEXTJS-SUPABASE-TEMPLATE/actions/workflows/ci.yml/badge.svg)](https://github.com/DimitriTedom/NEXTJS-SUPABASE-TEMPLATE/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/DimitriTedom/NEXTJS-SUPABASE-TEMPLATE)](LICENSE)

A clean starter for:

- Next.js (App Router)
- Supabase Auth (email + password)
- Prisma (PostgreSQL)
- shadcn/ui + Tailwind
- Docker + Vercel-friendly build

## Quick start (local)

### 1) Install

```bash
npm install
```

Optional formatting:

```bash
npm run format
```

### 2) Configure env

```bash
cp .env.template .env
```

Fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3) Start Supabase locally

Requires the Supabase CLI and Docker.

```bash
supabase start
```

### 4) Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5) Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Routes included

- `/auth/register` – create account
- `/auth/login` – login
- `/dashboard` – protected page
- `/account` – protected page (reads Profile from Prisma)

## Deploy

### Vercel

Set env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

### Docker

```bash
docker build -t nextjs-template .
docker run -p 3000:3000 --env-file .env nextjs-template
```
