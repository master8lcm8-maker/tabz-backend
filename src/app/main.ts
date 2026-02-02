// src/app/main.ts

//  FIX: ensure globalThis.crypto exists (needed by @nestjs/schedule on some Node runtimes)
import { webcrypto } from 'crypto';
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto as any;
}

import { NestFactory } from '@nestjs/core';
import { HttpStatusBodySyncFilter } from './http-status-body-sync.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpStatusBodySyncFilter());
  app.getHttpAdapter().getInstance().set('etag', false);

  // Enable CORS for web (local dev + production web origins)
  const allow = new Set([
    // --- PROD WEB ORIGINS ---
    'https://8tabz.com',
    'https://www.8tabz.com',

    // --- LOCAL DEV ---
    'http://localhost:19006',        // Expo web default
    'http://localhost:8081',         // sometimes used by RN tooling
    'http://127.0.0.1:19006',
    'http://127.0.0.1:8081',
    'http://10.0.0.239:19006',       // your LAN host if you open web from another device
    'http://10.0.0.239:8081'
  ]);

  const allowedHeaders = [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'Cache-Control',
    'Pragma',
    'If-None-Match',
    'x-dev-seed-secret'
  ];

  // ✅ HARD FIX: guarantee OPTIONS preflight never hits Nest route layer (prevents 404 on OPTIONS)
  // This is minimal and safe: it only affects OPTIONS requests.
  app.getHttpAdapter().getInstance().use((req, res, next) => {
    if (req.method !== 'OPTIONS') return next();

    const origin = req.headers?.origin;
    if (origin && allow.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));

    // 204 = standard preflight success
    return res.status(204).send();
  });

  app.enableCors({
    origin: (origin, cb) => {
      // allow non-browser callers (curl, mobile native, server-to-server)
      if (!origin) return cb(null, true);
      return allow.has(origin) ? cb(null, true) : cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders,
  });

  // R4 proof: do NOT log the secret, only presence + length
  console.log('JWT_SECRET_PRESENT', !!process.env.JWT_SECRET, 'LEN', process.env.JWT_SECRET?.length);

  const port = 3000;

  //  Explicit bind to all interfaces (fixes Windows ambiguity)
  const server = await app.listen(port, '0.0.0.0');

  //  Log the real bound address (source of truth)
  const addr = server.address();
  console.log('TABZ backend bound to:', addr);
}
bootstrap();
