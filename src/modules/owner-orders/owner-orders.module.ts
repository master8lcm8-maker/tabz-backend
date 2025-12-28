import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerOrdersService } from './owner-orders.service';
import { OwnerOrdersController } from './owner-orders.controller';

import { WebsocketModule } from '../websocket/websocket.module'; // ✅ IMPORT SOCKET MODULE

@Module({
  imports: [
    TypeOrmModule.forFeature([]),

    WebsocketModule, // ✅ ENABLE GATEWAY IN THIS MODULE
  ],
  controllers: [OwnerOrdersController],
  providers: [OwnerOrdersService],
  exports: [OwnerOrdersService],
})
export class OwnerOrdersModule {}
