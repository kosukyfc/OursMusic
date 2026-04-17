# Code Coverage Setup

## GitHub Actions Integration

Add to CI/CD workflow to automatically report coverage:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
```

## Frontend Coverage (React)

### Vitest Configuration
```typescript
// vite.config.ts additions
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.storybook/',
        '**/*.stories.tsx',
      ],
    },
  },
});
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Backend Coverage (NestJS)

### Jest Configuration
```json
{
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.module.ts",
    "!src/main.ts",
    "!src/**/*.spec.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 75,
      "lines": 75,
      "statements": 75
    }
  }
}
```

### Run Tests with Coverage
```bash
npm run test:cov
```

## Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Backend   | 75%    | 65%     |
| Frontend  | 75%    | 60%     |
| Mobile    | 60%    | 50%     |
| **Total** | **75%**| **58%** |

## Badge

[![codecov](https://codecov.io/gh/oursmusic/oursmusic/branch/main/graph/badge.svg)](https://codecov.io/gh/oursmusic/oursmusic)

Add to README.md:
```markdown
[![codecov](https://codecov.io/gh/oursmusic/oursmusic/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/oursmusic/oursmusic)
```
