import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';

import { UsersModule } from '../users/users.module';
import { Staff } from '../staff/staff.entity';
import { Venue } from '../venues/venue.entity';

import { ProfileModule } from '../../profile/profile.module';

@Module({
  imports: [
    ConfigModule,

    UsersModule,
    TypeOrmModule.forFeature([
      Staff,
      Venue,
      PasswordResetToken,
      EmailVerificationToken,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
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
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}