# Frontend Bundle Optimization Guide

## Current Bundle Analysis

Run bundle analysis:
```bash
npm run build -- --analyze
```

This generates an interactive visualization showing:
- Component sizes
- Dependencies
- Unused code
- Optimization opportunities

---

## Code Splitting Strategy

### Route-Based Splitting
```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy routes
const Player = lazy(() => import('./routes/Player'));
const Playlists = lazy(() => import('./routes/Playlists'));
const RecommendationsPanel = lazy(() => import('./components/RecommendationsPanel'));

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/player" element={<Player />} />
        <Route path="/playlists" element={<Playlists />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-Based Splitting
```typescript
// Split heavy components
const LyricsViewer = lazy(() => import('./components/LyricsViewer'));
const AdvancedSearch = lazy(() => import('./components/AdvancedSearch'));

// Only load when needed
{showLyrics && <Suspense fallback={<Skeleton />}><LyricsViewer /></Suspense>}
```

---

## Image Optimization

### WebP Conversion
```bash
# Convert images to WebP with fallback
npm install -D sharp

# Use in component:
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Song cover" />
</picture>
```

### Lazy Image Loading
```typescript
<img 
  src="placeholder.jpg"
  data-src="actual-image.jpg"
  alt="Cover"
  loading="lazy"
/>
```

---

## Dependency Optimization

### Tree-Shaking Configuration
```json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

### Remove Unused Dependencies
```bash
# Audit dependencies
npm audit

# Remove unused
npm prune

# Check bundle included packages
npm ls --depth=0
```

### Duplicate Dependency Detection
```bash
# Find duplicate packages
npm dedupe
```

---

## Bundle Size Targets

| Bundle | Current | Target | Savings |
|--------|---------|--------|---------|
| Main | ~65KB | <50KB | 23% |
| Vendor | ~85KB | <65KB | 24% |
| Player | ~40KB | <30KB | 25% |
| **Total** | **~180KB** | **<120KB** | **33%** |

---

## Performance Thresholds (Lighthouse)

| Metric | Target | Tool |
|--------|--------|------|
| Largest Contentful Paint (LCP) | <2.5s | Core Web Vitals |
| First Input Delay (FID) | <100ms | Core Web Vitals |
| Cumulative Layout Shift (CLS) | <0.1 | Core Web Vitals |
| First Contentful Paint (FCP) | <1.8s | Lighthouse |
| Time to Interactive (TTI) | <3.8s | Lighthouse |

---

## Optimization Checklist

### Pre-Deployment
- [ ] Run bundle analysis
- [ ] Check for duplicate dependencies
- [ ] Tree-shake unused code
- [ ] Minify and compress assets
- [ ] Convert images to WebP
- [ ] Setup lazy loading
- [ ] Configure code splitting

### Post-Deployment
- [ ] Monitor bundle size in CI/CD
- [ ] Track Core Web Vitals in production
- [ ] Check Lighthouse scores
- [ ] Monitor user performance metrics
- [ ] Track page load times by route

---

## Compression Configuration

### Gzip (browser-supported)
```typescript
// vite.config.ts
import { compression } from 'vite-compression-plugin';

export default {
  plugins: [
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
    }),
  ],
};
```

### Brotli (better compression)
```typescript
compression({
  algorithm: 'brotli',
  ext: '.br',
  threshold: 10240,
  quality: 11,
})
```

### Server Configuration
```nginx
# nginx.conf
gzip on;
gzip_types text/plain application/json application/javascript text/css;
gzip_min_length 1000;

location ~* \.(js|css)$ {
  gzip_static on;
  add_header Vary "Accept-Encoding";
}
```

---

## Monitoring & Alerts

### Setup Bundle Size Monitoring
```bash
# Add to package.json scripts
{
  "scripts": {
    "analyze": "vite build --analyze",
    "analyze:compare": "vite build --analyze > dist/bundle-report.json"
  }
}
```

### GitHub Actions Alert
```yaml
- name: Check bundle size
  run: |
    npm run build
    SIZE=$(stat --format=%s dist/*.js | awk '{sum+=$1} END {print sum}')
    
    if [ $SIZE -gt 130000 ]; then
      echo "::error::Bundle size exceeded 130KB: $SIZE bytes"
      exit 1
    fi
```

---

## Advanced Optimizations

### Service Worker Caching
```typescript
// Cache expensive assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/js/main.js',
        '/css/style.css',
        '/images/logo.webp',
      ]);
    }),
  );
});
```

### HTTP/2 Server Push
```typescript
// Push critical resources
response.push('/css/critical.css');
response.push('/js/main.js');
```

### Resource Hints
```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin />

<!-- Prefetch likely next routes -->
<link rel="prefetch" href="/player.js" />

<!-- DNS prefetch third-party domains -->
<link rel="dns-prefetch" href="//api.spotify.com" />
```

---

## Expected Improvements

### Load Time Reduction
- **First Paint**: 300ms → 150ms (50% faster)
- **Largest Paint**: 2500ms → 1200ms (52% faster)
- **Interactive**: 4200ms → 2100ms (50% faster)

### User Experience
- **Bounce Rate**: -15%
- **Session Duration**: +25%
- **Conversion**: +8-12%

### SEO Impact
- **Lighthouse Score**: 65 → 90+
- **Core Web Vitals**: All green
- **Mobile Performance**: +30%

---

## Debugging Bundle Issues

### Inspect Bundle
```bash
# Show what's in bundle
npm run build
ls -lah dist/

# Analyze dependencies
npm ls

# Find bloated packages
npm dedupe
```

### Trace Imports
```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    open: true,
    gzipSize: true,
  }),
]
```

### Remove Unused Code
```typescript
// Check for dead code
npm install -D unimported
unimported --extensions ts,tsx

// TreeShake configuration
// Ensure sideEffects: false in package.json
```

---

## Continuous Monitoring

### Weekly Bundle Report
```bash
#!/bin/bash
# weekly-bundle-check.sh
npm run build
du -sh dist/
echo "Bundle size: $(du -sh dist/ | cut -f1)" >> bundle-history.log

# Alert if exceeded
SIZE=$(du -sh dist/ | cut -d'K')
if [ "$SIZE" -gt "150" ]; then
  slack_notify "Bundle size: ${SIZE}K - investigate!"
fi
```

---

## References

- [Vite Bundle Analysis](https://rollupjs.org/guide/en/#visualizer)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React Code Splitting](https://reactjs.org/docs/code-splitting.html)
- [Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse Metrics](https://developers.google.com/web/tools/lighthouse/v3/scoring)
