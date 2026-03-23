import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FreeboardItem } from "./entities/freeboard-item.entity";
import { FreeboardClaim } from "./entities/freeboard-claim.entity";
import { FreeboardService } from "./freeboard.service";
import { FreeboardController } from "./freeboard.controller";
import { CatalogModule } from "../catalog/catalog.module";
import { VenuesModule } from "../venues/venues.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RedemptionsModule } from "../redemptions/redemptions.module";
import { VenuePresenceModule } from "../venue-presence/venue-presence.module";
import { Redemption } from "../redemptions/entities/redemption.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([FreeboardItem, FreeboardClaim, Redemption]),
    CatalogModule,
    VenuePresenceModule,
    forwardRef(() => VenuesModule),
    NotificationsModule,
    RedemptionsModule,
  ],
  controllers: [FreeboardController],
  providers: [FreeboardService],
  exports: [FreeboardService],
})
export class FreeboardModule {}