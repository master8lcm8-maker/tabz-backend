// src/owner/owner-info.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OwnerInfoController } from './owner-info.controller';
import { OwnerInfoService } from './owner-info.service';

import { Wallet } from '../wallet/wallet.entity';
import { Venue } from '../modules/venues/venue.entity';
import { OwnerBankInfo } from './owner-bank-info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Venue, OwnerBankInfo])],
  controllers: [OwnerInfoController],
  providers: [OwnerInfoService],
  exports: [OwnerInfoService],
})
export class OwnerInfoModule {}
