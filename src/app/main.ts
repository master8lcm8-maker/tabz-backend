import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for web (Expo web at localhost:8081)
  app.enableCors({
    origin: true, // reflect the request origin (http://localhost:8081, etc.)
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = 3000;
  await app.listen(port);
  console.log(`TABZ backend listening on http://localhost:${port}`);
}
bootstrap();
