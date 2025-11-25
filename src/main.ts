import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow all CORS (safe for now)
  app.enableCors({
    origin: '*',
  });

  // Prefix all backend routes with /api
  app.setGlobalPrefix('api');

  // Start server (DigitalOcean uses process.env.PORT)
  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`TABZ backend running on port ${port}`);
}

bootstrap();
