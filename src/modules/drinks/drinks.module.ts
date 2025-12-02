import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DrinkOrder } from './entities/drink-order.entity';
import { DrinksService } from './drinks.service';
import { DrinksController } from './controllers/drinks.controller';

// ✅ Correct path based on your folders: src/modules/venues/venue.entity.ts
import { Venue } from '../venues/venue.entity';

// ✅ Wallet is at src/wallet/wallet.module.ts, this path is correct
import { WalletModule } from '../../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DrinkOrder, Venue]),
    WalletModule,
  ],
  controllers: [DrinksController],
  providers: [DrinksService],
  exports: [DrinksService],
})
export class DrinksModule {}
