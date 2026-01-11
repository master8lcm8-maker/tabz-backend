// src/app/main.ts

// ✅ FIX: ensure globalThis.crypto exists (needed by @nestjs/schedule on some Node runtimes)
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
    origin: [
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:8083',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'Cache-Control',
      'Pragma',
      'If-None-Match',
      'x-dev-seed-secret',
    ],
  });

  const port = 3000;

  // 🔒 Explicit bind to all interfaces (fixes Windows ambiguity)
  const server = await app.listen(port, '0.0.0.0');

  // 🔍 Log the real bound address (source of truth)
  const addr = server.address();
  console.log('TABZ backend bound to:', addr);
}
bootstrap();
