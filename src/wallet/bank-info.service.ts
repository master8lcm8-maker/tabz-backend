import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankInfo } from './bank-info.entity';

@Injectable()
export class BankInfoService {
  constructor(
    @InjectRepository(BankInfo)
    private readonly bankInfoRepo: Repository<BankInfo>,
  ) {}

  /**
   * Get bank info for a user. Returns null if not found.
   */
  async getForUser(userId: number): Promise<BankInfo | null> {
    const info = await this.bankInfoRepo.findOne({ where: { userId } });
    return info ?? null;
  }

  /**
   * Set or update bank info for a user.
   * For now we store values in the *Enc fields without real encryption.
   */
  async setForUser(
    userId: number,
    params: {
      bankName: string;
      accountHolderName: string;
      routingNumber: string;
      accountNumber: string;
    },
  ): Promise<BankInfo> {
    const { bankName, accountHolderName, routingNumber, accountNumber } = params;

    const last4 =
      accountNumber && accountNumber.length >= 4
        ? accountNumber.slice(-4)
        : accountNumber;

    let info = await this.bankInfoRepo.findOne({ where: { userId } });
    if (!info) {
      info = this.bankInfoRepo.create({
        userId,
        bankNameEnc: bankName,
        accountHolderNameEnc: accountHolderName,
        routingNumberEnc: routingNumber,
        accountNumberEnc: accountNumber,
        accountLast4: last4,
      });
    } else {
      info.bankNameEnc = bankName;
      info.accountHolderNameEnc = accountHolderName;
      info.routingNumberEnc = routingNumber;
      info.accountNumberEnc = accountNumber;
      info.accountLast4 = last4;
    }

    return this.bankInfoRepo.save(info);
  }
}
