import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

import { UserBlock } from './block.entity';
import { UserReport } from './report.entity';
import { AuditEvent } from './audit.entity';

// REQUIRED because SafetyController uses ProfileService
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBlock, UserReport, AuditEvent]),
    ProfileModule,
  ],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
