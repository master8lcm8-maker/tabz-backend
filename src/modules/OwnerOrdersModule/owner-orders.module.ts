import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerOrdersService } from './owner-orders.service';
import { OwnerOrdersController } from './owner-orders.controller';
import { StoreItemOrder } from '../store-items/entities/store-item-order.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Venue } from '../venues/entities/venue.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreItemOrder, Wallet, Venue, User]),
  ],
  controllers: [OwnerOrdersController],
  providers: [OwnerOrdersService],
  exports: [OwnerOrdersService],
})
export class OwnerOrdersModule {}
