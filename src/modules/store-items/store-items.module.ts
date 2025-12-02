import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoreItemsController } from './store-items.controller';
import { StoreItemsAdminController } from './store-items.admin.controller';
import { StoreItemsService } from './store-items.service';
import { WalletModule } from '../../wallet/wallet.module';

// 👇 Import the entities so TypeORM can register metadata
import { StoreItem } from './store-item.entity';
import { StoreItemOrder } from './store-item-order.entity';

@Module({
  imports: [
    // ✅ Register StoreItem + StoreItemOrder with TypeORM in this module
    TypeOrmModule.forFeature([StoreItem, StoreItemOrder]),

    JwtModule.register({
      secret: 'secret123', // same as before, used for manual JWT in controller
    }),

    // ✅ Gives StoreItemsService access to WalletService
    WalletModule,
  ],
  controllers: [StoreItemsController, StoreItemsAdminController],
  providers: [StoreItemsService],
  exports: [StoreItemsService],
})
export class StoreItemsModule {}
