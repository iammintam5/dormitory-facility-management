# Dormitory Facility Management

## Cau truc thu muc

```text
.
|-- backend
|   |-- .env.example
|   |-- nest-cli.json
|   |-- package.json
|   |-- prisma
|   |   `-- schema.prisma
|   |-- src
|   |   |-- app.module.ts
|   |   |-- health
|   |   |   |-- health.controller.ts
|   |   |   `-- health.module.ts
|   |   |-- main.ts
|   |   `-- prisma
|   |       |-- prisma.module.ts
|   |       `-- prisma.service.ts
|   `-- tsconfig.json
`-- frontend
    |-- .env.example
    |-- index.html
    |-- package.json
    |-- postcss.config.cjs
    |-- src
    |   |-- App.tsx
    |   |-- components
    |   |   `-- HealthStatusCard.tsx
    |   |-- index.css
    |   |-- lib
    |   |   `-- axios.ts
    |   |-- main.tsx
    |   `-- router.tsx
    |-- tailwind.config.ts
    |-- tsconfig.app.json
    |-- tsconfig.json
    |-- tsconfig.node.json
    `-- vite.config.ts
```

## Huong dan chay local

### 1. Tao file env

Backend:

```bash
cd backend
copy .env.example .env
```

Frontend:

```bash
cd ../frontend
copy .env.example .env
```

### 2. Cai dependency

```bash
cd frontend
npm install
cd ../backend
npm install
```

### 3. Chuan bi PostgreSQL va Prisma

Cap nhat `DATABASE_URL` trong `backend/.env` theo database cua ban, sau do:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

Neu ban dung Supabase, nen cau hinh them `DIRECT_URL` de Prisma migrate ket noi truc tiep toi database thay vi di qua pooler. Mau cau hinh:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?pgbouncer=true&connection_limit=1&schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?schema=public"
```

Goi y:

- `DATABASE_URL`: dung cho runtime cua app, co the la connection pooler do Supabase cung cap.
- `DIRECT_URL`: dung cho Prisma Migrate, nen la direct connection.
- Neu ban dang dung PostgreSQL local, co the de `DATABASE_URL` va `DIRECT_URL` giong nhau.

### 4. Chay backend

```bash
cd backend
npm run start:dev
```

Backend se chay tai `http://localhost:3000` va co route:

```text
GET /health
=> { "status": "ok" }
```

### 5. Chay frontend

```bash
cd frontend
npm run dev
```

Frontend se chay tai `http://localhost:5173` va tu dong goi `GET http://localhost:3000/health`.
