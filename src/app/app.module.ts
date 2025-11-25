import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { VenuesModule } from '../modules/venues/venues.module';
import { FreeboardModule } from '../modules/freeboard/freeboard.module';
import { DrinksModule } from '../modules/drinks/drinks.module';
import { SpotlightModule } from '../modules/spotlight/spotlight.module';
import { StormModule } from '../modules/storm/storm.module';
import { QrModule } from '../modules/qr/qr.module';
import { RewardsModule } from '../modules/rewards/rewards.module';
import { StaffModule } from '../modules/staff/staff.module';
import { WebsocketModule } from '../modules/websocket/websocket.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    VenuesModule,
    FreeboardModule,
    DrinksModule,
    SpotlightModule,
    StormModule,
    QrModule,
    RewardsModule,
    StaffModule,
    WebsocketModule,
  ],
  controllers: [
    AppController,
    HealthController,   // ⬅️ FIXED: Now correctly registered
  ],
  providers: [
    AppService,
  ],
})
export class AppModule {}

