// src/modules/staff/staff.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Staff } from './staff.entity';
import { StaffService } from './staff.service';
import { StaffAdminController } from './staff.admin.controller';
import { StaffController } from './staff.controller';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffStrategy } from './staff.strategy';
import { StaffAuthStrategy } from './staff-auth.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff]),
    PassportModule.register({ defaultStrategy: 'staff-jwt' }),
    JwtModule.register({
      secret: process.env.STAFF_JWT_SECRET || 'TABZ_STAFF_JWT_SECRET',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StaffAdminController, StaffController, StaffAuthController],
  providers: [
    StaffService,
    StaffAuthService,
    StaffStrategy,      // JWT-based staff strategy ('staff-jwt')
    StaffAuthStrategy,  // custom token strategy ('staff-auth' using passport-custom)
  ],
  exports: [StaffService, StaffAuthService],
})
export class StaffModule {}
