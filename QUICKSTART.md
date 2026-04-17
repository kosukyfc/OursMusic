# 🚀 Quick Start Guide

Get OursMusic running in **5 minutes**! 

## Prerequisites
- Docker & Docker Compose installed
- OR Node.js 20+, PostgreSQL 15+, Redis 7+
- Git

---

## Option 1: Docker (Recommended) ⚡

```bash
# 1. Clone and navigate
git clone https://github.com/oursmusic/oursmusic.git
cd oursmusic

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env if needed

# 3. Start everything
docker-compose up -d

# 4. View logs
docker-compose logs -f

# Done! Access at:
# Web:  http://localhost:5173
# API:  http://localhost:3000
# Docs: http://localhost:3000/api/docs
```

**Stopping**:
```bash
docker-compose down
```

---

## Option 2: Local Development

### Backend Setup
```bash
cd backend

# Install & configure
cp .env.example .env
npm install

# Database setup
npm run prisma:migrate
npm run prisma:seed  # Optional

# Run development server
npm run start:dev

# In another terminal:
npm run test
npm run lint
```

**API**: `http://localhost:3000`  
**Docs**: `http://localhost:3000/api/docs`

### Frontend Setup
```bash
cd web

# Install & configure
cp .env.example .env
npm install

# Run development server
npm run dev
```

**Web**: `http://localhost:5173`

### Mobile Setup
```bash
cd mobile

flutter pub get
flutter run
```

---

## First Steps After Setup

### 1. Check Health
```bash
curl http://localhost:3000/health | jq
```

### 2. Sign Up
Visit `http://localhost:5173` and create an account

### 3. Upload Music (Admin)
Navigate to Admin Panel → Import Songs

### 4. View API Docs
Visit `http://localhost:3000/api/docs`

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `docker-compose ps` | Check service status |
| `docker-compose logs service-name` | View logs |
| `docker-compose exec backend npm run prisma:migrate` | Run migrations |
| `npm run test` | Run tests |
| `npm run lint:fix` | Fix linting errors |
| `npm run build` | Build for production |

---

## Configuration

Edit `backend/.env`:

```env
# Database (required)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/music_app

# Redis (required)
REDIS_URL=redis://:redis@redis:6379

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Auth
JWT_SECRET=your-dev-secret-key-here
ADMIN_TOKEN=admin-dev-token

# Storage (optional)
STORAGE_TYPE=local  # or: s3, nas, drive
```

---

## Troubleshooting Quick Fixes

**Port in use?**
```bash
docker-compose down
docker-compose up -d
```

**Database errors?**
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
docker-compose exec backend npm run prisma:migrate
```

**See more**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Next Steps

- 📖 [Full Documentation](./README.md)
- 🏗️ [Backend Guide](./backend/README.md)
- 🤝 [Contributing](./CONTRIBUTING.md)
- 🐛 [Troubleshooting](./TROUBLESHOOTING.md)
- 📋 [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

---

**Happy coding! 🎵**
