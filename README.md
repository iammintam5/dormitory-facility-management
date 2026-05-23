# Dormitory Facility Management
=======
# Dormitory Facility Management

## Cấu trúc thư mục

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

## Hướng dẫn chạy local

### 1. Tạo file env

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

### 2. Cài dependency

```bash
cd frontend
npm install
cd ../backend
npm install
```

### 3. Chuẩn bị PostgreSQL và Prisma

Cập nhật `DATABASE_URL` trong `backend/.env` theo database, sau đó:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Chạy backend

```bash
cd backend
npm run start:dev
```

Backend sẽ chạy tại `http://localhost:3000` và có route:

```text
GET /health
=> { "status": "ok" }
```

### 5. Chạy frontend

```bash
cd frontend
npm run dev
```
