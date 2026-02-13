// src/modules/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

import { UsersModule } from '../users/users.module';
import { Staff } from '../staff/staff.entity';

// âœ… allows /auth/me to resolve profile context
import { ProfileModule } from '../../profile/profile.module';
import { VenuesModule } from '../venues/venues.module';

@Module({
  imports: [
    // âœ… ensure ConfigService is available
    ConfigModule,

    UsersModule,
    forwardRef(() => VenuesModule),
    TypeOrmModule.forFeature([Staff]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // âœ… SINGLE SOURCE OF TRUTH: same secret used by JwtStrategy
    JwtModule.registerAsync({
      imports: [ConfigModule, VenuesModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret =
          process.env.JWT_SECRET ||
          config.get<string>('JWT_SECRET') ||
          'dev_jwt_secret_fallback';

        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),

    ProfileModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // registers passport "jwt"
    JwtAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}


