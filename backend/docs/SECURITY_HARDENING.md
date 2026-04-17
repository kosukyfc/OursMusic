# Security Hardening Roadmap

## Level 1: Current Implementation ✅

- ✅ JWT authentication with signature verification
- ✅ HTTPS/TLS support via reverse proxy
- ✅ CORS properly configured
- ✅ Rate limiting on auth endpoints
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React escaping)
- ✅ CSRF tokens on state-changing endpoints
- ✅ Secure headers (Helmet middleware)

---

## Level 2: Advanced Security (+0.1 points)

### 2.1 Encryption at Rest
```typescript
// Encrypt sensitive fields in database
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

function encryptField(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Use in Prisma hooks
model User {
  email String
  refreshToken String? @encrypted // Custom directive
}
```

### 2.2 API Key Security
```typescript
// Hash and rate-limit API keys
@Injectable()
export class ApiKeyService {
  async validateApiKey(key: string) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { hash },
    });
    
    if (!apiKey) throw new UnauthorizedException();
    
    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    
    return apiKey;
  }
}
```

### 2.3 Security Headers
```typescript
// Add to main.ts
import helmet from '@nestjs/helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdn.example.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' },
  xContentTypeOptions: {},
  xPoweredBy: false,
}));
```

### 2.4 Request Signature Verification
```typescript
// Verify request signatures for critical APIs
@Injectable()
export class SignatureGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-signature'];
    const payload = JSON.stringify(request.body);
    
    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
}
```

### 2.5 Audit Logging
```typescript
// Log sensitive operations
@Injectable()
export class AuditLogger {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    action: string,
    resource: string,
    changes: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        changes,
        ipAddress: this.getClientIp(),
        userAgent: this.getUserAgent(),
        timestamp: new Date(),
      },
    });
  }
}
```

---

## Level 3: Compliance & Privacy (+0.1 points)

### 3.1 Data Anonymization
```typescript
// Anonymize user data for analytics
function anonymizeUser(user: User) {
  return {
    ...user,
    email: 'user_' + crypto.randomUUID(),
    name: 'User_' + user.id.substring(0, 8),
  };
}
```

### 3.2 Privacy-Preserving Analytics
```typescript
// Track user journeys without collecting PII
@Injectable()
export class AnalyticsService {
  async trackEvent(userId: string, event: string, data: any) {
    // Only track aggregated, anonymized data
    const anonymizedUserId = crypto
      .createHash('sha256')
      .update(userId + process.env.SALT)
      .digest('hex');
    
    await this.prisma.analyticsEvent.create({
      data: {
        anonymizedUserId,
        event,
        data: this.sanitizeData(data), // Remove PII
        timestamp: new Date(),
      },
    });
  }
}
```

### 3.3 Secure Session Management
```typescript
// Prevent session fixation and hijacking
@Injectable()
export class SessionService {
  async createSession(userId: string) {
    const sessionId = crypto.randomUUID();
    
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        ipAddress: this.getClientIp(),
        userAgent: this.getUserAgent(),
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
        isActive: true,
      },
    });
    
    return session;
  }

  async validateSession(sessionId: string, ipAddress: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    
    // IP change detection - potential hijacking
    if (session.ipAddress !== ipAddress) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Session compromised');
    }
    
    return session;
  }
}
```

---

## Level 4: Advanced Threat Detection (+0.1 points)

### 4.1 Intrusion Detection
```typescript
// Detect suspicious patterns
@Injectable()
export class AnomalyDetectionService {
  async checkForAnomaly(userId: string, action: string) {
    const recentActions = await this.getRecentActions(userId, 60); // Last 60 seconds
    
    // Detection rules
    if (recentActions.length > 100) {
      throw new TooManyRequestsException('Suspicious activity detected');
    }
    
    // Geographic anomaly
    if (this.isGeographicAnomaly(userId)) {
      await this.sendSecurityAlert(userId);
    }
    
    // Impossible travel
    if (this.isImpossibleTravel(userId)) {
      await this.requireReauthentication(userId);
    }
  }
}
```

### 4.2 Bot Detection
```typescript
// Detect and rate-limit bot traffic
import { recaptcha } from '@nestjs-modules/recaptcha';

@Injectable()
@UseGuards(RecaptchaGuard)
export class BotProtectionService {
  async verifyHuman(recaptchaToken: string) {
    const score = await this.recaptchaService.verify(recaptchaToken);
    
    if (score < 0.5) {
      throw new ForbiddenException('Bot traffic detected');
    }
    
    return true;
  }
}
```

### 4.3 DDoS Protection
```typescript
// Advanced rate limiting
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

app.use(rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:', // Rate limit prefix
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  },
}));
```

---

## Level 5: Zero-Trust Architecture (+0.1 points)

### 5.1 Continuous Authentication
```typescript
// Re-verify on sensitive operations
@UseGuards(JwtAuthGuard, ContinuousAuthGuard)
@Post('payment')
async makePayment(@CurrentUser() user: User, @Body() data: PaymentDto) {
  // User is re-authenticated for sensitive operation
  return this.paymentService.process(user.id, data);
}
```

### 5.2 Micro-segmentation
```typescript
// Isolate high-risk operations
@Injectable()
export class PaymentModule {
  // Separate rate limit tier
  static RATE_LIMIT = 10; // Much stricter
  
  // Separate auth requirements
  static REQUIRES_MFA = true;
  static REQUIRES_RECENT_LOGIN = 3600; // 1 hour
}
```

### 5.3 Temporary Elevated Privileges
```typescript
// Grant time-limited elevated access
@Post('admin/grant-temporary-access')
async grantAccess(@CurrentUser() user: User) {
  const token = await this.generateElevatedToken(user.id, 300); // 5 minutes
  
  return {
    accessToken: token,
    expiresIn: 300,
    warning: 'This token expires in 5 minutes',
  };
}
```

---

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2) ✅
- ✅ JWT + signature verification
- ✅ Input validation
- ✅ CORS + rate limiting
- ✅ Security headers

### Phase 2: Advanced (Weeks 3-4)
- [ ] Encryption at rest
- [ ] API key security
- [ ] Audit logging
- [ ] Session management

### Phase 3: Detection (Weeks 5-6)
- [ ] Anomaly detection
- [ ] Bot detection
- [ ] DDoS protection
- [ ] Intrusion detection

### Phase 4: Zero-Trust (Weeks 7-8)
- [ ] Continuous authentication
- [ ] Micro-segmentation
- [ ] Privilege escalation management
- [ ] Security events streaming

---

## Security Testing

### Manual Testing
```bash
# Test for common vulnerabilities
npm install -g retire  # Check for known vulnerabilities
npm install -g snyk    # Dependency scanning

retire --jspath
snyk test --severity-threshold=high
```

### Automated Scanning
```bash
# GitHub Actions workflow
- name: Security Audit
  run: |
    npm audit
    npm run security-check
```

### Penetration Testing
```bash
# Recommended tools
- OWASP ZAP
- Burp Suite Community
- npm install -g sqlmap
```

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [NestJS Security](https://docs.nestjs.com/security/overview)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Web Security Academy](https://portswigger.net/web-security)
