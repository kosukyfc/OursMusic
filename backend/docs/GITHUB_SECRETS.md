# GitHub Actions Secrets Setup Guide

## Required Secrets for OursMusic CI/CD

Add these secrets to your GitHub repository: **Settings → Secrets and variables → Actions**

### Database & Infrastructure
```
DATABASE_URL
DATABASE_SHADOW_URL (for Prisma migrations)
REDIS_HOST
REDIS_PASSWORD
```

### Authentication & Authorization
```
JWT_SECRET (min 32 chars)
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

### API Keys & Third-Party Services
```
GENIUS_ACCESS_TOKEN (lyrics sync)
MUSIXMATCH_API_KEY (lyrics sync)
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
```

### AWS S3 & CDN
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET
```

### Error Tracking & Monitoring
```
SENTRY_DSN
SENTRY_AUTH_TOKEN (for releases)
SONARQUBE_HOST
SONARQUBE_TOKEN
```

### Container Registry
```
DOCKER_USERNAME
DOCKER_PASSWORD
# OR
GHCR_TOKEN (GitHub Container Registry)
```

### Code Coverage
```
CODECOV_TOKEN
```

### Email Service
```
SMTP_USER
SMTP_PASSWORD
SMTP_HOST
SMTP_PORT
```

## Setup Commands

### GitHub CLI
```bash
# Login
gh auth login

# Add secret
gh secret set JWT_SECRET --body "your_secret_here"

# Bulk import from .env
gh secret import < .env.secrets
```

### Format for Bulk Import (.env.secrets)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
REDIS_PASSWORD=...
```

## Security Best Practices

1. **Never commit secrets** - Use `.env.local` (gitignored)
2. **Rotate regularly** - Update JWT_SECRET, API keys quarterly
3. **Minimal permissions** - Grant only needed IAM roles
4. **Audit access** - Use GitHub audit logs to track secret access
5. **Use environment-specific secrets** - Separate dev/staging/prod secrets
6. **Encrypted review** - Never paste secrets in PR reviews

## Accessing Secrets in Workflows

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: npm run deploy
```

## Environment-Specific Secrets

For multi-environment setup:

```
# Development
DEV_DATABASE_URL
DEV_SENTRY_DSN

# Staging  
STAGING_DATABASE_URL
STAGING_SENTRY_DSN

# Production
PROD_DATABASE_URL
PROD_SENTRY_DSN
```

## Secret Rotation Checklist

- [ ] Generate new JWT_SECRET
- [ ] Update GitHub Actions secrets
- [ ] Rotate API keys (Genius, Musixmatch, Spotify)
- [ ] Rotate database passwords
- [ ] Update .env.example (non-sensitive parts)
- [ ] Notify team of changes
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor logs for auth errors
- [ ] Document rotation date

## Troubleshooting

**Secret not found in workflow:**
```bash
# Verify secret exists
gh secret list

# Check secret is accessible to workflow
# (must be in same repo, or organization secret)
```

**Can't access secret in Docker build:**
```yaml
# Must pass as --build-arg
- name: Build Docker image
  run: |
    docker build \
      --build-arg DATABASE_URL=${{ secrets.DATABASE_URL }} \
      -t oursmusic:latest .
```

## Reference
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
