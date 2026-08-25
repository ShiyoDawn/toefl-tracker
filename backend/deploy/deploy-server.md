# TOEFL API Server Deployment

Assumed server path:

```text
/www/server-apps/toefl-api
```

## 1. PostgreSQL

Create database and user:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE toefl_tracker;
CREATE USER toefl_user WITH ENCRYPTED PASSWORD 'change_this_password';
GRANT ALL PRIVILEGES ON DATABASE toefl_tracker TO toefl_user;
\q
```

For PostgreSQL 15+, also run:

```bash
sudo -u postgres psql -d toefl_tracker
```

```sql
GRANT ALL ON SCHEMA public TO toefl_user;
\q
```

## 2. Environment

Copy `.env.example` to `.env` and fill real secrets:

```bash
cp .env.example .env
```

Important production values:

```text
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
COOKIE_SECURE=false
FRONTEND_ORIGIN=http://toefl.shiyo.top
```

Set `COOKIE_SECURE=true` after HTTPS is enabled.

## 3. Build And Migrate

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm prune --omit=dev
```

## 4. Systemd

```bash
sudo cp deploy/toefl-api.service /etc/systemd/system/toefl-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now toefl-api
sudo systemctl status toefl-api
```

## 5. Verify

```bash
curl http://127.0.0.1:3001/api/health
curl http://toefl.shiyo.top/api/health
```
