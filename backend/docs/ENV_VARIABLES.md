# Environment Variables Guide

## Quick Start
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

## Backend Environment Variables

### Database
```
DATABASE_URL=postgresql://user:password@localhost:5432/oursmusic
DATABASE_SHADOW_URL=postgresql://user:password@localhost:5432/oursmusic_shadow
```

### Redis Cache
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
CACHE_TTL=3600
```

### Authentication
```
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRATION=86400
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Email
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@oursmusic.com
```

### Music APIs
```
GENIUS_ACCESS_TOKEN=your_genius_token
MUSIXMATCH_API_KEY=your_musixmatch_key
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
```

### Error Tracking
```
SENTRY_DSN=https://xxxx@sentry.io/12345
SENTRY_ENVIRONMENT=production
```

### Storage
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=oursmusic-storage
CDN_URL=https://cdn.oursmusic.com
```

### Server
```
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### Feature Flags
```
ENABLE_LYRICS_SYNC=true
ENABLE_RECOMMENDATIONS=true
ENABLE_COLLABORATIVE_PLAYLISTS=true
MAINTENANCE_MODE=false
```

## Frontend Environment Variables

### API Configuration
```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_ENV=development
```

### Authentication
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Analytics
```
VITE_SENTRY_DSN=https://xxxx@sentry.io/12345
VITE_SENTRY_ENV=development
```

## Mobile Environment Variables

Create `lib/config/env.dart`:
```dart
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3000/api',
);
```

Build with environment:
```bash
flutter run --dart-define=API_URL=https://api.oursmusic.com
```

## Secrets Management

### GitHub Actions Secrets
Add to repository settings → Secrets and variables:
- `DATABASE_URL`
- `SENTRY_DSN`
- `CLERK_SECRET_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Local Development
Never commit `.env` file! Use `.env.example` as template.

### Production Safety
- Use strong, unique values for each secret
- Rotate secrets periodically
- Never share JWT_SECRET
- Use AWS Secrets Manager or similar for production

## Validation

Check if all required variables are set:
```bash
npm run validate:env
```

## Different Environments

### Development
- Local database with no password
- Redis on localhost:6379
- API running on localhost:3000

### Staging
- Remote database with SSL
- Redis cluster
- Staging API domain

### Production
- Managed database service
- Redis enterprise
- CDN configured
- All third-party integrations active
