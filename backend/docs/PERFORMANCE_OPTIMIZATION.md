# Performance Optimization Roadmap

## Current Metrics (Baseline)
- Average API response time: ~300ms
- Database queries per second: ~50
- Cache hit rate: ~65%
- Frontend bundle size: ~180KB gzipped
- Lighthouse score: 75/100

## Target Metrics (Week 4)
- Average API response time: **<150ms** ✅ (50% reduction)
- Database queries per second: **<30** ✅ (40% reduction via caching)
- Cache hit rate: **>85%** ✅ (smart cache strategy)
- Frontend bundle size: **<120KB** ✅ (code splitting + tree shaking)
- Lighthouse score: **90+** ✅ (critical performance optimizations)

---

## Backend Optimization

### 1. Database Query Optimization

**Current Issues:**
- N+1 queries in user recommendations
- Missing indices on frequently filtered columns
- No query result caching

**Solutions:**
```typescript
// Before: N+1 query issue
const users = await prisma.user.findMany();
users.forEach(u => console.log(u.playlists)); // N additional queries

// After: Use select() to fetch relationships
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    playlists: { take: 5 }, // Limit fetched relations
  },
  take: 100,
  skip: (page - 1) * 100, // Pagination
});
```

**Database Indices:**
```prisma
model Song {
  @@index([uploadedBy])
  @@index([genre])
  @@index([artist])
  @@fulltext([title, artist]) // For full-text search
}

model PlaylistSong {
  @@index([playlistId])
  @@index([songId])
  @@unique([playlistId, songId])
}

model User {
  @@index([email])
  @@index([createdAt])
}
```

### 2. Redis Caching Strategy

**Multi-tier caching:**
```typescript
// Tier 1: In-memory cache (immediate)
// Tier 2: Redis cache (1-7 days)
// Tier 3: Database (source of truth)

const cacheConfig = {
  userProfile: 1800,      // 30 minutes
  playlists: 3600,        // 1 hour
  songs: 86400,           // 1 day
  recommendations: 604800, // 7 days
};

// Cache invalidation on updates
await cache.del(`user:${userId}:profile`);
await cache.del(`user:${userId}:recommendations`);
```

### 3. API Response Compression

```typescript
// main.ts
app.use(compression({
  threshold: 1024, // Only compress if > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
```

### 4. Query Pagination & Limits

```typescript
// Good pagination with cursor
const songs = await prisma.song.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
  where: { genre: selectedGenre },
});
```

### 5. Connection Pooling

```typescript
// .env
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=20&pool_mode=transaction"
```

---

## Frontend Optimization

### 1. Code Splitting

```typescript
// Before: Everything in one bundle
import all from './all-components';

// After: Lazy load routes
const PlayerPage = lazy(() => import('./pages/Player'));
const PlaylistPage = lazy(() => import('./pages/Playlist'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/playlists" element={<PlaylistPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 2. Image Optimization

```typescript
// Use next-gen formats with fallback
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <source srcSet="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="Song cover" loading="lazy" />
</picture>

// Or use Vite plugins
import { defineConfig } from 'vite';
import ViteImageOptimizer from 'vite-plugin-image-optimizer';

export default defineConfig({
  plugins: [ViteImageOptimizer()],
});
```

### 3. Bundle Analysis

```bash
# Analyze bundle size
npm run build
npm run analyze
# Look for large dependencies to replace
```

### 4. Virtual Scrolling for Lists

```typescript
import { FixedSizeList } from 'react-window';

export const SongList = ({ songs }) => (
  <FixedSizeList
    height={600}
    itemCount={songs.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <SongCard song={songs[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### 5. Web Vitals Optimization

```typescript
// Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## Mobile Optimization

### 1. Offline Support

```dart
// lib/services/offline_service.dart
class OfflineService {
  static Future<void> cachePlaylist(Playlist playlist) async {
    final box = await Hive.openBox('playlists');
    await box.put(playlist.id, playlist);
  }

  static Future<Playlist?> getOfflinePlaylist(String id) async {
    final box = await Hive.openBox('playlists');
    return box.get(id);
  }
}
```

### 2. Battery Optimization

- Reduce API polling frequency
- Use exponential backoff
- Disable background sync when battery low

### 3. Data Compression

```dart
// Enable gzip compression for API calls
final client = HttpClient();
client.addCredentials(
  Uri.parse(apiUrl),
  'Realm',
  HttpClientBasicCredentials(username, password),
);
```

---

## Monitoring & Targets

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| API Response Time (p95) | 300ms | <150ms | Query optimization, caching |
| DB Queries/sec | 50 | <30 | N+1 fixes, pagination |
| Cache Hit Rate | 65% | >85% | Multi-tier cache strategy |
| Bundle Size | 180KB | <120KB | Code splitting, tree shaking |
| Lighthouse Score | 75 | 90+ | Image opt, lazy load, core vitals |
| Time to Interactive | 3.5s | <2s | Reduce main thread work |
| Cumulative Layout Shift | 0.15 | <0.1 | Fixed heights, lazy load |

---

## Implementation Order

**Week 1 (Performance):**
1. Add database indices
2. Implement Redis caching strategy
3. Fix N+1 queries
4. Add API response compression

**Week 2 (Frontend):**
1. Code splitting with React.lazy()
2. Image optimization
3. Virtual scrolling for lists
4. Measure Web Vitals

**Week 3 (Observability):**
1. Deploy Prometheus
2. Setup Grafana dashboards
3. Configure alerting
4. Performance monitoring

**Week 4 (Polish):**
1. E2E performance tests
2. Load testing (k6)
3. Security hardening
4. Documentation

Expected Impact: **+0.4 points (9.3 → 9.7)**
