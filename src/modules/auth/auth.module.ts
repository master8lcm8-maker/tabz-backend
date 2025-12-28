import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { UsersModule } from '../users/users.module';
import { Staff } from '../staff/staff.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Staff]),

    // ✅ REQUIRED: ensures ConfigService exists here even if global wiring gets weird
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // ✅ HARD GUARANTEE: never undefined
        secret: config.get<string>('JWT_SECRET') || 'dev_jwt_secret_fallback',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
