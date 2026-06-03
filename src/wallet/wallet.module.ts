import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { Wallet } from '../wallet/wallet.entity';
import { CashoutRequest } from '../wallet/cashout-request.entity';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { PayoutSource } from '../wallet/payout-source.entity';
import { VenueWallet } from '../wallet/venue-wallet.entity';
import { CashoutLock } from '../wallet/cashout-lock.entity';
import { Transfer } from '../wallet/transfer.entity';
import { VenueWalletTransaction } from '../wallet/venue-wallet-transaction.entity';

import { BankInfo } from '../wallet/bank-info.entity';
import { OwnerBankInfo } from '../owner/owner-bank-info.entity'; // ADMIN_HQ_PHASE_02Q_R2B_R10_R2_R3_WALLET_MODULE_OWNERBANKINFO_REPO_RESCUE

import { WalletService } from '../wallet/wallet.service';
import { WalletController } from '../wallet/wallet.controller';
import { BankInfoController } from '../wallet/bank-info.controller';
import { CashoutSchedulerService } from '../wallet/cashout-scheduler.service';
import { BankInfoService } from '../wallet/bank-info.service';
import { PayoutAllocationService } from '../wallet/payout-allocation.service';

// âœ… Websocket
import { WebsocketModule } from '../modules/websocket/websocket.module';

// âœ… Identity (REQUIRED for IdentityService injection)
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      CashoutRequest,
      PayoutSource,
      WalletTransaction,
      VenueWallet,
      VenueWalletTransaction,
      CashoutLock,
      Transfer,
      BankInfo,
    OwnerBankInfo,
    ]),

    // cron scheduler
    ScheduleModule.forRoot(),

    // websockets
    WebsocketModule,

    // ðŸ”‘ FIX: make IdentityService available here
    IdentityModule,
  ],

  controllers: [WalletController, BankInfoController],
  providers: [WalletService, CashoutSchedulerService, BankInfoService, PayoutAllocationService],
  exports: [WalletService],
})
export class WalletModule {}

