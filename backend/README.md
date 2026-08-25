# TOEFL Tracker API

Backend for `http://toefl.shiyo.top/api/*`.

## Stack

- Node.js 22+
- Fastify
- PostgreSQL
- Prisma
- HttpOnly cookie session
- Email verification through SMTP

## Local Setup

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Health check:

```bash
curl http://127.0.0.1:3001/api/health
```

## Production

The service should listen on `127.0.0.1:3001`; Nginx exposes it through:

```text
http://toefl.shiyo.top/api/*
```

Run after deploying:

```bash
cd /www/server-apps/toefl-api
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm prune --omit=dev
node dist/server.js
```

For `systemd`, copy `deploy/toefl-api.service` to `/etc/systemd/system/toefl-api.service`.
