import { Module } from '@nestjs/common';

import { VenuesService } from './venues.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '../../profile/profile.module';
import { Venue } from './venue.entity';
@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([Venue]),
  ],
  controllers: [],
  providers: [
    VenuesService
  ],
  exports: [
    VenuesService
  ],
})
export class VenuesModule {}


