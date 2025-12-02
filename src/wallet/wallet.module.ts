// src/wallet/wallet.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
  ],
  controllers: [WalletController],   // ✅ expose HTTP routes
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
