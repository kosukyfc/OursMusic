import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import cookieParser from 'cookie-parser';
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";
import { DevicesGateway } from "./devices/devices.gateway";
import { setupSwagger } from "./common/swagger/swagger.config";

(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn"],
  });

  // ── Ping endpoint (sem dependências - apenas para verificar se app está online) ──
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/ping') {
      res.json({ status: 'pong', timestamp: new Date().toISOString() });
      return;
    }
    next();
  });

  const configService = app.get(ConfigService);
  const frontendOrigin = configService.get("FRONTEND_URL", "http://localhost:5173");
  const isProd = configService.get("NODE_ENV") === "production";
  const logger = new Logger('Main');

  // ── Sentry initialization ──────────────────────────────────────────────────
  const sentryDsn = configService.get<string>("SENTRY_DSN");
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get("SENTRY_ENVIRONMENT", "development"),
      tracesSampleRate: parseFloat(configService.get("SENTRY_TRACES_SAMPLE_RATE", "1.0")),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.errorHandler());
    logger.log("✓ Sentry initialized");
  }

  // ── Swagger documentation ──────────────────────────────────────────────────
  setupSwagger(app);
  logger.log("✓ Swagger docs available at /api/docs");

  // ── Cookie parser (necessário para ler HttpOnly cookies) ───────────────────
  app.use(cookieParser());

  // ── Preflight CORS middleware — responde OPTIONS manualmente ──────────────
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    
    // Configuração local apenas
    const isAllowed = !origin || 
      origin === "http://localhost:5173" ||
      origin === "http://localhost:3000" ||
      origin === frontendOrigin;

    // ngrok support (comentado - localhost only):
    // const isAllowed = !origin || 
    //   origin === frontendOrigin ||
    //   origin === "http://localhost:5173" ||
    //   origin === "http://localhost:3000" ||
    //   origin === "https://oursmusics.vercel.app" ||
    //   origin.endsWith('.ngrok-free.app') ||
    //   origin.endsWith('.ngrok-free.dev') ||
    //   origin.endsWith('.ngrok.io') ||
    //   origin.endsWith('.loca.lt') ||
    //   origin.endsWith('.trycloudflare.com') ||
    //   origin.endsWith('.vercel.app');

    if (isAllowed && origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
      res.header('Access-Control-Allow-Headers', 
        'Content-Type,Authorization,X-Request-ID,X-Admin-Token,X-Device-Type'
        // ngrok headers (comentado - localhost only):
        // ,bypass-tunnel-reminder,ngrok-skip-browser-warning
      );
      res.header('Access-Control-Expose-Headers', 'X-Request-ID');
    }

    // Responder imediatamente a OPTIONS
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  });

  // ── CORS: permite localhost apenas ────────────────────────────────────────
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    frontendOrigin,
  ];
  
  // ngrok support (comentado - descomente se usar ngrok):
  // const allowedOrigins = [
  //   frontendOrigin,
  //   "http://localhost:5173",
  //   "http://localhost:3000",
  //   "https://oursmusics.vercel.app",
  //   "https://yellow-kiwis-invite.loca.lt",
  // ];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Sem origin (mobile, curl, etc) = permitir
      if (!origin) return callback(null, true);
      
      // Origem exata na lista = permitir
      if (allowedOrigins.includes(origin)) return callback(null, true);
      
      // ngrok support (comentado - localhost only):
      // Se termina com domínio de tunnel = permitir
      // if (
      //   origin.endsWith('.loca.lt') ||
      //   origin.endsWith('.ngrok-free.app') ||
      //   origin.endsWith('.ngrok.io') ||
      //   origin.endsWith('.trycloudflare.com') ||
      //   origin.endsWith('.vercel.app')
      // ) return callback(null, true);
      
      // Caso contrário = rejeitar
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Admin-Token",
      "X-Device-Type",
      // ngrok headers (comentado - localhost only):
      // "bypass-tunnel-reminder",
      // "ngrok-skip-browser-warning",
    ],
    exposedHeaders: ["X-Request-ID"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // ── Request ID — rastreabilidade sem expor internos ────────────────────────
  app.use((_req: any, res: any, next: any) => {
    const id = randomUUID();
    res.setHeader("X-Request-ID", id);
    next();
  });

  // ── Remover headers que revelam stack ──────────────────────────────────────
  app.use((_req: any, res: any, next: any) => {
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");
    next();
  });

  // ── Helmet: HTTP security headers ─────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        imgSrc:      ["'self'", "data:", "https:"],
        mediaSrc:    ["'self'", "https:"],
        connectSrc:  ["'self'", frontendOrigin, "wss:", "ws:"],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
        baseUri:     ["'self'"],
        formAction:  ["'self'"],
        frameAncestors: ["'none'"],
      },
    } : false, // Desabilitar CSP em desenvolvimento para facilitar debugging
    hsts: isProd
      ? { maxAge: 63072000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permittedCrossDomainPolicies: false,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
  }));

  // ── Global validation pipe ─────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
  }));

  // ── Honeypot: rotas que atacantes tentam — loga e retorna 404 ─────────────
  const honeypots = [
    "/wp-admin", "/wp-login.php", "/.env",
    "/config", "/phpinfo.php", "/api/v1/admin",
  ]; // v2
  for (const path of honeypots) {
    app.use(path, (_req: any, res: any) => {
      // Em produção, logar IP para SIEM
      res.status(404).end();
    });
  }

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port, "0.0.0.0");
  app.get(DevicesGateway).startClockBroadcast();
  console.log(`Backend running on port ${port} [${isProd ? "production" : "development"}]`);
}

bootstrap();