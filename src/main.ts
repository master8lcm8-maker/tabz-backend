import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from your app (for now, open to all; we can tighten later)
  app.enableCors({
    origin: '*',
  });

  // Optional but recommended: prefix all routes with /api
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 8080);
}

bootstrap();
