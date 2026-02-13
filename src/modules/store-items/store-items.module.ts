// src/modules/store-items/store-items.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoreItemsController } from './store-items.controller';
import { StoreItemsAdminController } from './store-items.admin.controller';
import { StoreItemsOwnerController } from './store-items.owner.controller';
import { StoreItemsService } from './store-items.service';
import { StoreItem } from './store-item.entity';
import { StoreItemOrder } from './store-item-order.entity';

import { WalletModule } from '../../wallet/wallet.module';

// ✅ IMPORTANT: provide the gateway so StoreItemsService can inject it
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([StoreItem, StoreItemOrder]), WalletModule],
  controllers: [StoreItemsController, StoreItemsAdminController, StoreItemsOwnerController],
  providers: [StoreItemsService, WebsocketGateway],
  exports: [StoreItemsService],
})
export class StoreItemsModule {}

