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

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff]),
    PassportModule,
    JwtModule.register({
      secret: 'TABZ_STAFF_JWT_SECRET', // temp; move to ENV later
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    StaffAdminController,
    StaffController,
    StaffAuthController,
  ],
  providers: [
    StaffService,
    StaffAuthService,
    StaffStrategy,
  ],
  exports: [
    StaffService,
    StaffAuthService,
  ],
})
export class StaffModule {}
