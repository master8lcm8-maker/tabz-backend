import { Module } from '@nestjs/common';

import { VenuesService } from './venues.service';
import { VenuesController } from './venues.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '../../profile/profile.module';
import { Venue } from './venue.entity';
@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([Venue]),
  ],
  controllers: [VenuesController],
  providers: [
    VenuesService
  ],
  exports: [
    VenuesService
  ],
})
export class VenuesModule {}



