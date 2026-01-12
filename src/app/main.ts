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

  // Enable CORS for web (Expo web at localhost:8081/8082/8083)
  app.enableCors({
  origin: (origin, cb) => {
    // allow non-browser callers (curl, mobile native, server-to-server)
    if (!origin) return cb(null, true);

    const allow = new Set([
      'http://localhost:19006',        // Expo web default
      'http://localhost:8081',         // sometimes used by RN tooling
      'http://127.0.0.1:19006',
      'http://127.0.0.1:8081',
      'http://10.0.0.239:19006',       // your LAN host if you open web from another device
      'http://10.0.0.239:8081'
    ]);

    return allow.has(origin) ? cb(null, true) : cb(new Error('CORS blocked: ' + origin), false);
  },
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'Cache-Control',
    'Pragma',
    'If-None-Match',
    'x-dev-seed-secret'
  ],
});

  const port = 3000;

  //  Explicit bind to all interfaces (fixes Windows ambiguity)
  const server = await app.listen(port, '0.0.0.0');

  //  Log the real bound address (source of truth)
  const addr = server.address();
  console.log('TABZ backend bound to:', addr);
}
bootstrap();

