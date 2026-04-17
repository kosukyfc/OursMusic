# OursMusic Backend Documentation

## Getting Started

### Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configurations

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### Development

```bash
# Start development server with hot-reload
npm run start:dev

# Run tests
npm run test
npm run test:watch
npm run test:cov

# Run linting
npm run lint
npm run lint:fix

# Build for production
npm run build

# Start production server
npm run start:prod
```

## API Documentation

Swagger docs available at: `http://localhost:3000/api/docs`

## Architecture

### Folder Structure

```
src/
├── common/                 # Shared utilities, decorators, pipes
│   ├── cache/             # Redis caching module
│   ├── health/            # Health check endpoints
│   ├── logging/           # Winston logger setup
│   ├── swagger/           # Swagger configuration
│   └── decorators/        # Custom NestJS decorators
├── auth/                  # Authentication module
│   ├── strategies/        # Passport strategies
│   ├── guards/            # JwtAuthGuard, AdminGuard
│   ├── auth.service.ts
│   └── auth.controller.ts
├── songs/                 # Songs management
├── storage/               # Multi-adapter storage
│   ├── adapters/
│   │   ├── s3.adapter.ts
│   │   ├── nas.adapter.ts
│   │   └── drive.adapter.ts
│   └── storage.interface.ts
├── playlists/             # Playlist management
├── subscriptions/         # Premium billing
└── ... (other modules)
```

### Core Concepts

#### Storage Adapters

The project uses a factory pattern for storage:

```typescript
// Usage in services
const adapter = this.storageFactory.getAdapter(storageType);
await adapter.upload(file, folder);
const url = await adapter.getSignedUrl(path);
```

#### Caching

Redis caching is integrated via `CacheModule`:

```typescript
// In services
constructor(
  @Inject(CACHE_MANAGER)
  private cache: Cache,
) {}

// Usage
const cached = await this.cache.get('songs:popular');
if (!cached) {
  const data = await this.getSongs();
  await this.cache.set('songs:popular', data, 3600);
}
```

#### Real-Time Updates

WebSockets via Socket.io:

```typescript
// In gateways
@WebSocketGateway()
export class DevicesGateway {
  @SubscribeMessage('user-activity')
  handleActivity(client: Socket, data: any) {
    this.server.to(`user:${data.userId}`).emit('activity', data);
  }
}
```

## Database

### Prisma Schema

Located at `prisma/schema.prisma`. Key models:

- `User` - User accounts and profiles
- `Song` - Music tracks
- `Playlist` - User playlists
- `Favorite` - Favorite tracks
- `Subscription` - Premium subscriptions
- `Device` - Connected user devices
- `Activity` - User activity log

### Migrations

```bash
# Create migration
npm run prisma:migrate -- --name add_user_field

# View migration history
npm run prisma:migrate -- deploy --dry-run

# Reset database (⚠️ destructive)
npm run prisma:migrate -- reset
```

### Performance

Add indices to frequently queried fields:

```prisma
model Song {
  id String @id @default(cuid())
  userId String
  createdAt DateTime @default(now())
  playCount Int @default(0)
  
  @@index([userId])
  @@index([userId, createdAt])
  @@index([playCount])
}
```

## Testing

### Unit Tests

```bash
npm run test -- --testPathPattern="songs.service"
```

### Coverage

```bash
npm run test:cov
# Reports generated in coverage/ directory
```

## Deployment

### Docker

```bash
# Build image
docker build -t oursmusic-backend .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  oursmusic-backend
```

### Environment Variables

See `.env.example` for all available variables.

### Security Considerations

1. **Secrets Management**
   - Never commit `.env` file
   - Use environment variable services in production
   - Rotate JWT secrets regularly

2. **Database**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups
   - Run migrations from CI/CD

3. **Storage**
   - Use IAM roles for S3 access
   - Secure Google Drive service accounts
   - Restrict NAS access via firewall

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

Response includes:
- Database status
- Memory usage
- Redis connectivity

### Logging

Logs are written to:
- **Development**: Console (colorized)
- **Production**: 
  - `logs/combined.log` - All logs
  - `logs/error.log` - Errors only
  - `logs/exceptions.log` - Uncaught exceptions

### Error Tracking

Sentry integration (if configured):

```typescript
// Errors automatically sent to Sentry
throw new BadRequestException('Invalid input');
```

## Troubleshooting

### Database Connection Error

```bash
# Check DATABASE_URL format
# postgresql://user:password@host:5432/dbname

# Test connection
psql postgresql://user:password@host:5432/dbname
```

### Redis Connection Error

```bash
# Check REDIS_URL format
# redis://:password@host:6379

# Test connection
redis-cli -u redis://:password@host:6379 ping
```

### Storage Upload Errors

Check adapter configuration and credentials for selected storage type.

## Performance Optimization

### Database Queries

Use `.select()` to fetch only needed fields:

```typescript
const songs = await this.prisma.song.findMany({
  select: { id: true, title: true, artist: true },
  take: 20,
});
```

### Caching Strategies

- Playlist data: 1 hour TTL
- Popular songs: 30 minutes TTL
- User profile: 2 hours TTL

### Rate Limiting

Configured at module level:

```typescript
// Applied to sensitive endpoints
@UseGuards(ThrottlerGuard)
@Throttle('short')
async login() { }
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
