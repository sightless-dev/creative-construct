# Creative Construct

Monorepo scaffold (Next.js web + NestJS API + Postgres + Redis).

## Quick start (local)

1) Start database services:

```bash
docker compose up -d
```

If you need a clean DB volume:

```bash
docker compose down -v
```

2) Install deps:

```bash
pnpm install
```

3) Apply migrations + generate Prisma client:

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

4) Scan storage library into DB:

```bash
pnpm scan:library
```

5) Run apps:

```bash
pnpm dev
```

Web: http://localhost:3000/ru  
API: http://localhost:4000/health

## Env samples

`apps/api/.env`:

```
PORT=4000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL="postgresql://cc:cc_password@localhost:5432/creative_construct?schema=public"
STORAGE_DIR=storage
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Useful checks

API:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/slot-games
```

Ports (Windows):

```bash
netstat -ano | findstr :4000
netstat -ano | findstr :3000
```

Kill Node on Windows:

```bash
taskkill /F /IM node.exe
```
