import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { Venue } from './venue.entity';

// ✅ ADD: ProfileModule so VenuesService can inject ProfileService
import { ProfileModule } from '../../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue]),
    ProfileModule, // ✅ required for ProfileService injection
  ],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
