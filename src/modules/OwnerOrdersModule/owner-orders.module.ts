import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerOrdersService } from '../owner-orders/owner-orders.service';
import { OwnerOrdersController } from '../owner-orders/owner-orders.controller';
import { StoreItemOrder } from '../store-items/store-item-order.entity';
import { Wallet } from '../../wallet/wallet.entity';
import { Venue } from '../venues/venue.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreItemOrder, Wallet, Venue, User]),
  ],
  controllers: [OwnerOrdersController],
  providers: [OwnerOrdersService],
  exports: [OwnerOrdersService],
})
export class OwnerOrdersModule {}
