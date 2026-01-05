import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { Wallet } from '../wallet/wallet.entity';
import { CashoutRequest } from '../wallet/cashout-request.entity';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { VenueWallet } from '../wallet/venue-wallet.entity';
import { CashoutLock } from '../wallet/cashout-lock.entity';
import { Transfer } from '../wallet/transfer.entity';
import { VenueWalletTransaction } from '../wallet/venue-wallet-transaction.entity';

import { BankInfo } from '../wallet/bank-info.entity';

import { WalletService } from '../wallet/wallet.service';
import { WalletController } from '../wallet/wallet.controller';
import { BankInfoController } from '../wallet/bank-info.controller';
import { CashoutSchedulerService } from '../wallet/cashout-scheduler.service';
import { BankInfoService } from '../wallet/bank-info.service';

// ✅ Websocket
import { WebsocketModule } from '../modules/websocket/websocket.module';

// ✅ Identity (REQUIRED for IdentityService injection)
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      CashoutRequest,
      WalletTransaction,
      VenueWallet,
      VenueWalletTransaction,
      CashoutLock,
      Transfer,
      BankInfo,
    ]),

    // cron scheduler
    ScheduleModule.forRoot(),

    // websockets
    WebsocketModule,

    // 🔑 FIX: make IdentityService available here
    IdentityModule,
  ],

  controllers: [WalletController, BankInfoController],
  providers: [WalletService, CashoutSchedulerService, BankInfoService],
  exports: [WalletService],
})
export class WalletModule {}
