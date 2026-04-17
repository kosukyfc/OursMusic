# Troubleshooting Guide

## Backend Issues

### Database Connection Errors

**Error**: `Error: ECONNREFUSED on :5432`

**Solution**:
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@host:5432/dbname

# Test connection manually
psql postgresql://user:password@localhost:5432/music_app

# If using Docker, ensure postgres service is healthy
docker-compose logs postgres
```

### Redis Connection Errors

**Error**: `Connection refused on :6379`

**Solution**:
```bash
# Check Redis is running
docker-compose ps redis

# Verify REDIS_URL in .env
# Format: redis://:password@host:6379

# Test connection manually
redis-cli -u redis://:password@localhost:6379 ping

# Should respond with: PONG
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

### Out of Memory

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node.js memory
node --max-old-space-size=4096 dist/src/main.js

# Or modify package.json scripts
"start:prod": "node --max-old-space-size=4096 dist/src/main.js"
```

### Prisma Migration Issues

**Error**: `Migration cannot be rolled back`

**Solution**:
```bash
# Reset database (⚠️ DESTRUCTIVE - loses all data)
npm run prisma:migrate reset

# Or manually reset
psql -U postgres -d music_app -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Then run migrations again
npm run prisma:migrate
```

### Swagger Docs Not Loading

**Error**: `404 on /api/docs`

**Solution**:
```bash
# Ensure Swagger is initialized in main.ts
import { setupSwagger } from './common/swagger/swagger.config';
setupSwagger(app);

# Check Node environment
NODE_ENV=development npm run start:dev

# Clear browser cache and reload
```

---

## Web (Frontend) Issues

### Build Failures

**Error**: `error: Unable to find browser instance`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

### Hot Module Reload (HMR) Not Working

**Error**: Components not updating on save

**Solution**:
```bash
# Check vite.config.ts HMR configuration
# Edit vite.config.ts:
server: {
  hmr: {
    protocol: 'ws',
    host: 'localhost',
    port: 5173
  }
}

# Restart dev server
npm run dev
```

### Zustand Store Not Persisting

**Error**: State resets on page reload

**Solution**:
```typescript
// Ensure persist middleware is used
const useStore = create<YourStore>()(
  persist(
    (set) => ({...}),
    { name: 'storage-key' }
  )
);

// Clear localStorage if needed
localStorage.clear()
```

### API Requests Timing Out

**Error**: `POST http://localhost:3000/... - net::ERR_FAILED`

**Solution**:
```bash
# Check backend is running
curl http://localhost:3000/health

# Check VITE_API_URL in .env
# Should match your backend address

# Verify CORS is enabled on backend
# Check main.ts CORS config
```

### Sentry Not Capturing Errors

**Error**: Errors not showing in Sentry dashboard

**Solution**:
```typescript
// Ensure initSentry() is called early
import { initSentry } from './utils/sentry';
initSentry();

// Check VITE_SENTRY_DSN is set
console.log(import.meta.env.VITE_SENTRY_DSN);

// Test manually
import * as Sentry from '@sentry/react';
Sentry.captureMessage('Test message');
```

---

## Mobile Issues

### Flutter Pub Get Fails

**Error**: `Unable to find dart packages`

**Solution**:
```bash
# Clear pub cache
flutter pub cache clean

# Get fresh dependencies
flutter pub get

# Or use pub upgrade
flutter pub upgrade
```

### Android Build Fails

**Error**: `FAILURE: Build failed with an exception`

**Solution**:
```bash
# Clean build
cd android && ./gradlew clean && cd ..
flutter clean

# Rebuild
flutter build apk

# Check Android SDK is installed
flutter doctor
```

### iOS Build Fails

**Error**: `CocoaPods could not find compatible versions`

**Solution**:
```bash
# Update pods
cd ios
pod deintegrate
pod install
cd ..

# Rebuild
flutter build ios
```

### Hot Reload Not Working

**Error**: Changes not reflected on device

**Solution**:
```bash
# Stop and restart flutter
flutter run

# Or use verbose output
flutter run -v

# Clear device cache
flutter clean
```

### Riverpod Provider Not Updated

**Error**: State not changing when expected

**Solution**:
```dart
// Ensure using .watch() not .read() in build()
final data = ref.watch(dataProvider); // ✅ Correct
// NOT: final data = ref.read(dataProvider); // ❌ Wrong

// Invalidate provider if needed
ref.invalidate(dataProvider);
```

### Firebase Not Initializing

**Error**: `Firebase.initializeApp() error`

**Solution**:
```bash
# Reconfigure Firebase
flutterfire configure

# Check google-services.json exists in android/app/
# Check GoogleService-Info.plist exists in ios/Runner/

# Rebuild
flutter clean
flutter pub get
flutter run
```

---

## Docker Issues

### Container Doesn't Start

**Error**: `Container exited with code 1`

**Solution**:
```bash
# Check logs
docker-compose logs backend

# Inspect image
docker images

# Rebuild
docker-compose build --no-cache backend

# Check Dockerfile for errors
```

### Network Issues Between Containers

**Error**: `Cannot reach postgres from backend`

**Solution**:
```bash
# Ensure network exists
docker network ls

# Check containers are on same network
docker inspect oursmusic-backend | grep Networks

# In docker-compose.yml, verify:
networks:
  oursmusic:
    driver: bridge

# Ensure service names match connection strings
DATABASE_URL=postgresql://postgres:pwd@postgres:5432/db_name
                                        ^^^^^^ service name
```

### Volume Permissions Denied

**Error**: `permission denied: /var/lib/postgresql/data`

**Solution**:
```bash
# On Linux, fix ownership
sudo chown 999:999 postgres_data/

# Or use proper dockerfile user
USER postgres

# Check volume in docker-compose.yml
volumes:
  postgres_data:
    driver: local
```

---

## Performance Issues

### Slow Queries

**Error**: API responses taking 5+ seconds

**Solution**:
```bash
# Check database indices
SELECT * FROM pg_stat_user_indexes;

# Add missing indices in prisma/schema.prisma
@@index([userId])
@@index([createdAt])

# Run migration
npm run prisma:migrate

# Profile queries
EXPLAIN ANALYZE SELECT * FROM songs WHERE userId = 'xxx';
```

### High Memory Usage

**Error**: Application using 500MB+ RAM

**Solution**:
```bash
# Check for memory leaks
node --inspect dist/src/main.js
# Use Chrome DevTools: chrome://inspect

# Enable Node.js profiling
node --prof dist/src/main.js
node --prof-process isolate-*.log > profile.txt

# Reduce cache TTL
CACHE_TTL=300  # 5 minutes instead of 1 hour
```

### Slow Frontend

**Error**: Web UI sluggish/laggy

**Solution**:
```bash
# Check React DevTools for re-renders
# Identify unnecessary re-renders with Profiler

# Use Zustand middleware for debugging
devtools(store)

# Optimize with selectors
const value = store((state) => state.specificValue)
// Instead of entire store

# Check bundle size
npm run build
# Review dist/index.html
```

---

## Security Issues

### Failed Login Attempts

**Solution**:
```bash
# Check audit logs
curl http://localhost:3000/admin/audit-logs?action=LOGIN&status=failure \
  -H "Authorization: Bearer $TOKEN"

# Check rate limiting
# Temporarily increase for debugging
THROTTLER_LIMIT=1000
```

### Unauthorized Errors

**Error**: `401 Unauthorized` on protected routes

**Solution**:
```bash
# Verify JWT token
# Decode at https://jwt.io (development only!)

# Check JWT_SECRET in .env
# Ensure token has 'sub' claim (user ID)

# Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Cookie: refreshToken=..."
```

### CORS Errors

**Error**: `No 'Access-Control-Allow-Origin' header`

**Solution**:
```bash
# Check allowed origins in main.ts
# Add your frontend URL to whitelist

# For development:
frontendOrigin: 'http://localhost:5173'

# For tunnel tools:
origin.endsWith('.ngrok.io')  // Add similar pattern
```

---

## Monitoring & Debugging

### Enable Debug Logging

```bash
# Backend
DEBUG=* npm run start:dev

# Web
localStorage.setItem('debug', 'app:*')

# Mobile
flutter run -v
```

### Check System Health

```bash
curl http://localhost:3000/health | jq '.'

# Should respond with:
{
  "status": "ok",
  "database": {"status": "up"},
  "memory": {"status": "up"}
}
```

### View Real-Time Logs

```bash
# Docker
docker-compose logs -f backend

# File (production)
tail -f logs/combined.log
```

---

## Getting Help

1. **Check logs first**: `docker-compose logs -f <service>`
2. **Test connectivity**: `curl`, `redis-cli`, `psql`
3. **Search documentation**: [Official docs](../README.md)
4. **GitHub Issues**: [Report bug](https://github.com/oursmusic/oursmusic/issues)
5. **Community**: [GitHub Discussions](https://github.com/oursmusic/oursmusic/discussions)

---

*Last Updated: April 11, 2026*
