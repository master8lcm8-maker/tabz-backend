// src/profile/profile.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Profile } from './profile.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

// ✅ ADD
import { Venue } from '../modules/venues/venue.entity';

// ✅ ADD (M27.3 storage service)
import { SpacesUploadService } from '../storage/spaces-upload.service';

@Module({
  imports: [
    // ✅ ADD Venue so ProfileService can query venues for FV-19
    TypeOrmModule.forFeature([Profile, Venue]),
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    // ✅ M27.3
    SpacesUploadService,
  ],
  exports: [
    ProfileService,
    // ✅ M27.3 (will be reused by avatar + cover endpoints)
    SpacesUploadService,
  ],
})
export class ProfileModule {}
