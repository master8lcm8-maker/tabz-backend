import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreditsAccount } from './entities/credits-account.entity';
import { CreditsLedgerEntry } from './entities/credits-ledger-entry.entity';
import { CreditsTransfer } from './entities/credits-transfer.entity';

import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditsAccount, CreditsLedgerEntry, CreditsTransfer]),
  ],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
