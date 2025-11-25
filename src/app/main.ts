import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow frontend & mobile apps to connect
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Enable validation for DTOs globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global API prefix — all routes start with /api
  app.setGlobalPrefix('api');

  // Required for DigitalOcean / Heroku style hosting
  const port = process.env.PORT || 8080;
  await app.listen(port, () => {
    console.log(`TABZ backend is running on port ${port}`);
  });
}

bootstrap();
