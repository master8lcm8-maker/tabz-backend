import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { Venue } from './venue.entity';
import { ProfileModule } from '../../profile/profile.module';
import { FreeboardModule } from '../freeboard/freeboard.module';
import { VenuePresenceModule } from '../venue-presence/venue-presence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue]),
    ProfileModule,
    forwardRef(() => FreeboardModule),
    VenuePresenceModule,
  ],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
