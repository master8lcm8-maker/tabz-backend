// src/modules/store-items/store-items.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoreItemsController } from './store-items.controller';
import { StoreItemsAdminController } from './store-items.admin.controller'; // ✅ FIX: correct filename
import { StoreItemsService } from './store-items.service';

import { StoreItem } from './store-item.entity';
import { StoreItemOrder } from './store-item-order.entity';

import { WalletModule } from '../../wallet/wallet.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreItem, StoreItemOrder]),
    WalletModule,
    WebsocketModule, // ✅ provides/export WebsocketGateway
  ],
  controllers: [StoreItemsController, StoreItemsAdminController],
  providers: [StoreItemsService],
  exports: [StoreItemsService],
})
export class StoreItemsModule {}
