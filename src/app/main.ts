import { NestFactory } from '@nestjs/core';
import { HttpStatusBodySyncFilter } from './http-status-body-sync.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpStatusBodySyncFilter());
  app.getHttpAdapter().getInstance().set('etag', false);

  // CORS: deterministic allowlist + echoes exact origin.
  const allowedOrigins = new Set<string>([
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:8083',
  ]);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: any, allow?: any) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, origin);
      return callback(new Error(`CORS_BLOCKED_ORIGIN:${origin}`), false);
    },
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
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  const port = Number(process.env.PORT || 3000);
  const server = await app.listen(port, '0.0.0.0');

  console.log('TABZ backend bound to:', server.address());
}

bootstrap();
