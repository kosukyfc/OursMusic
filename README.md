# OursMusic - Self-Hosted Music Streaming Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)

<div align="center">

🎵 **[OursMusic](https://github.com/oursmusic/oursmusic)** — Your personal, self-hosted music streaming server

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Features

- ✅ **Self-Hosted** - Take full control of your music library
- ✅ **Multi-Platform** - Web, Mobile (iOS/Android), and TV support
- ✅ **Real-Time Sync** - WebSocket-powered live updates across devices
- ✅ **Multiple Storage** - Local, NAS, Amazon S3, or Google Drive
- ✅ **Offline Mode** - Download tracks for offline listening
- ✅ **Premium Subscriptions** - Monetize with family plans
- ✅ **Social Features** - Social profiles, favorites, and interactions
- ✅ **Admin Dashboard** - Full control panel for server management
- ✅ **Security** - JWT auth, rate limiting, helmet protection
- ✅ **Performance** - Redis caching, optimized queries, CDN ready
- ✅ **Monitoring** - Health checks, logging, error tracking (Sentry)
- ✅ **API Documentation** - Swagger/OpenAPI auto-generated docs

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker & Docker Compose** (optional, recommended)
- **PostgreSQL** 15+
- **Redis** 7+
- **Flutter SDK** (for mobile development)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/oursmusic/oursmusic.git
cd oursmusic

# Create environment file
cp backend/.env.example backend/.env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run prisma:migrate

# Access the application
# Web: http://localhost:5173
# API: http://localhost:3000
# Docs: http://localhost:3000/api/docs
```

### Option 2: Local Development

```bash
# Backend
cd backend
npm install
npm run prisma:migrate
npm run start:dev

# Web (in another terminal)
cd web
npm install
npm run dev

# Mobile (optional, in another terminal)
cd mobile
flutter pub get
flutter run

# Access
# Web: http://localhost:5173
# API: http://localhost:3000
```

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    OursMusic Platform                       │
├─────────────────────────────────────────────────────────────┤
│
│  Frontend Layer
│  ├── Web (React 19 + Vite)             [/web]
│  ├── Mobile (Flutter)                   [/mobile]
│  └── Admin Panel (PHP)                  [/admin]
│
│  Backend Layer
│  ├── NestJS API Server                  [/backend]
│  ├── WebSocket Gateway (Socket.io)
│  ├── Job Queue (Cron tasks)
│  └── Event Emitters
│
│  Data Layer
│  ├── PostgreSQL Database
│  ├── Redis Cache
│  └── Multiple Storage Adapters
│      ├── Local Filesystem
│      ├── AWS S3
│      ├── Google Drive
│      └── NAS
│
│  DevOps
│  ├── Docker & Docker Compose
│  ├── GitHub Actions CI/CD
│  ├── Nginx Reverse Proxy
│  └── Health Monitoring
│
└─────────────────────────────────────────────────────────────┘
```

### Backend Modules

| Module | Purpose |
|--------|---------|
| **Auth** | JWT + Passport + Clerk authentication |
| **Songs** | Music management and streaming |
| **Playlists** | User playlists CRUD |
| **Favorites** | Favorite songs management |
| **Search** | Full-text and metadata search |
| **Offline** | Download and offline sync |
| **Storage** | Multi-adapter storage abstraction |
| **Social** | User profiles and interactions |
| **Subscription** | Premium plans and billing |
| **Admin** | Server administration |
| **Health** | System health monitoring |

## 📖 Documentation

- [Backend Setup Guide](./backend/README.md)
- [Web Frontend Guide](./web/README.md)
- [Mobile App Guide](./mobile/README.md)
- [API Documentation](./backend/API.md)
- [Architecture Decision Records](./docs/ADR.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)

## 🔧 Configuration

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/music_app

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m

# Storage
STORAGE_TYPE=s3  # local, s3, nas, drive
AWS_S3_BUCKET=your-bucket-name

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=http://localhost:5173

# Sentry (Error tracking)
SENTRY_DSN=https://your-sentry-dsn

# Admin
ADMIN_TOKEN=your-admin-token
```

## 📊 API Documentation

Interactive API docs are available at:
- **Development**: `http://localhost:3000/api/docs`
- **Production**: `https://api.yourdomain.com/api/docs`

## 🧪 Testing

```bash
# Backend
cd backend
npm run test           # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:cov      # Generate coverage report

# Web
cd web
npm run test          # (Configure your test runner)

# Admin
cd admin
php tests/run-tests.php
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET`
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Setup database backups
- [ ] Configure managed Redis (or run in cluster mode)
- [ ] Enable logging and monitoring (Sentry)
- [ ] Setup email service for notifications
- [ ] Configure storage backend (S3/Drive/NAS)
- [ ] Run security audit
- [ ] Setup CI/CD pipeline
- [ ] Monitor performance metrics
- [ ] Configure alerting

### Docker Production Deployment

```bash
# Build production images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Backup database
docker-compose exec postgres pg_dump -U postgres music_app > backup.sql
```

## 🔐 Security

- All API endpoints require JWT authentication (except public endpoints)
- Passwords hashed with bcrypt (library: `@node-rs/argon2`)
- Rate limiting on sensitive endpoints (5 req/s, 100 req/min, 1000 req/hour)
- CORS protection with customizable whitelist
- Helmet security headers enabled
- SQL injection protection via Prisma ORM
- XSS protection via React
- CSRF tokens on forms
- Regular security audits via Trivy
- Audit logging for admin actions

## 📈 Performance

- **Redis caching** for frequently accessed data
- **Database indices** on common queries
- **Lazy loading** in frontend
- **Image optimization** for thumbnails
- **WebSocket** for real-time updates
- **Request compression** via gzip
- **CDN ready** static asset delivery

## 🐛 Debugging

### Backend Logs

```bash
# Via Docker
docker-compose logs -f backend

# Winston logs (local development)
cat logs/combined.log
cat logs/error.log
```

### Frontend DevTools

- Browser DevTools for React debugging
- Network tab for API call inspection
- Redux DevTools (if state management added)

### Mobile Debugging

```bash
# Flutter verbose logs
flutter run -v

# Crash logs
flutter logs
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 License

This project is licensed under [AGPL-3.0](./LICENSE) - see LICENSE file for details.

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/oursmusic/oursmusic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/oursmusic/oursmusic/discussions)
- **Email**: support@oursmusic.com

## 🗺️ Roadmap

- [ ] Lyrics synchronization
- [ ] Podcast support
- [ ] Collaborative playlists in real-time
- [ ] Music recommendations with ML
- [ ] Audio equalizer
- [ ] Year-end statistics (Spotify Wrapped)
- [ ] Music video support
- [ ] User comments and reviews
- [ ] Advanced search with filters
- [ ] Smart push notifications

## 👥 Team

- Core Team: [Contributors](https://github.com/oursmusic/oursmusic/graphs/contributors)

---

<div align="center">

Made with ❤️ by the OursMusic community

[⬆ Back to top](#oursmusic---self-hosted-music-streaming-platform)

</div>
