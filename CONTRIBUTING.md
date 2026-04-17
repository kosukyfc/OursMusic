# Contributing to OursMusic

Thank you for your interest in contributing! This document provides guidelines and instructions.

## Code of Conduct

Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/oursmusic.git`
3. **Create a branch**: `git checkout -b feat/my-feature`
4. **Make your changes**
5. **Commit** with clear messages: `git commit -m "Add: new feature"`
6. **Push**: `git push origin feat/my-feature`
7. **Create a Pull Request**

## Development Setup

```bash
# Backend
cd backend && npm install && npm run start:dev

# Web (new terminal)
cd web && npm install && npm run dev

# Mobile (new terminal)
cd mobile && flutter pub get && flutter run
```

## Commit Convention

```
<type>: <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore, perf, security

**Example**:
```
feat: implement caching for playlists

Add Redis caching to improve performance for frequently accessed playlists.
Cache is invalidated when playlists are modified.

Fixes #123
```

## Code Quality

### Before Submitting

```bash
# Backend
cd backend
npm run lint        # Fix any linting errors
npm run test        # Ensure tests pass
npm run test:cov    # Check coverage

# Web
cd web
npm run build       # Ensure build succeeds
```

### Linting & Formatting

```bash
# Lint and auto-fix
npm run lint:fix

# Backend follows ESLint with security plugins
# Web follows Vite/TypeScript defaults
```

## Testing Requirements

- **Backend**: Unit tests for new services/controllers
- **Web**: Component tests for new features
- **Mobile**: Widget tests for new screens

```bash
npm run test -- --testPathPattern="my-feature"
npm run test:cov    # Generate coverage report
```

## Database Changes

If your changes require database modifications:

1. Update `prisma/schema.prisma`
2. Create migration: `npm run prisma:migrate -- --name descriptive_name`
3. Include migration files in PR

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Report security issues to security@oursmusic.com (not public issues)
- Use latest dependency versions

## PR Review Process

- All PRs require at least one approval
- CI/CD pipeline must pass
- Code coverage should not decrease
- Commit history should be clean

## Questions?

- Check existing [Issues](https://github.com/oursmusic/oursmusic/issues)
- Join [Discussions](https://github.com/oursmusic/oursmusic/discussions)
- Email: dev@oursmusic.com

---

Happy contributing! 🎵
