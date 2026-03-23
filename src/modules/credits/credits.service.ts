import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm';

import { CreditsAccount } from './entities/credits-account.entity';
import { CreditsLedgerEntry } from './entities/credits-ledger-entry.entity';
import { CreditsTransfer } from './entities/credits-transfer.entity';

type TransferInput = {
  fromUserId: number;
  toUserId: number;
  amountCents: number;
  note?: string;
};

type RequestInput = {
  requesterUserId: number;
  amountCents: number;
  note?: string;
};

type FundRequestInput = {
  requestId: number;
  funderUserId: number;
  amountCents: number;
};

type DevMintInput = {
  toUserId: number;
  amountCents: number;
};

@Injectable()
export class CreditsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(CreditsAccount)
    private readonly accountRepo: Repository<CreditsAccount>,

    @InjectRepository(CreditsLedgerEntry)
    private readonly ledgerRepo: Repository<CreditsLedgerEntry>,

    @InjectRepository(CreditsTransfer)
    private readonly transferRepo: Repository<CreditsTransfer>,
  ) {}

  private assertPositiveInt(n: any, code: string) {
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0) throw new BadRequestException(code);
    return x;
  }

  private async getOrCreateAccount(manager: any, userId: number): Promise<CreditsAccount> {
    const repo = manager.getRepository(CreditsAccount);
    let acct = await repo.findOne({ where: { userId } });
    if (!acct) {
      acct = repo.create({ userId, balanceCents: 0 });
      acct = await repo.save(acct);
    }
    return acct;
  }

  async getBalanceCents(userId: number): Promise<number> {
    const id = this.assertPositiveInt(userId, 'invalid_user');
    const acct = await this.accountRepo.findOne({ where: { userId: id } });
    return Number(acct?.balanceCents || 0);
  }

  // Read a request safely:
  // - requester (toUserId) can read
  // - any funder with a ledger entry for this request can read
  async getRequestForUser(userId: number, requestId: number): Promise<CreditsTransfer> {
    const uid = this.assertPositiveInt(userId, 'invalid_user');
    const rid = this.assertPositiveInt(requestId, 'invalid_request_id');

    const req = await this.transferRepo.findOne({ where: { id: rid } });
    if (!req) throw new NotFoundException('request_not_found');

    const toUserId = Number((req as any).toUserId);
    if (toUserId === uid) return req;

    // If not requester, allow only if this user funded it (ledger proves it)
    const funded = await this.ledgerRepo.findOne({
      where: {
        userId: uid,
        refType: 'CREDITS_REQUEST' as any,
        refId: rid as any,
      } as any,
    });

    if (!funded) throw new BadRequestException('forbidden');
    return req;
  }

  // DEV: mint credits into a user's account (for testing only)
  // Must write credits_ledger_entry with accountId to satisfy NOT NULL constraint
  async devMintCredits(input: DevMintInput): Promise<{ toUserId: number; amountCents: number; newBalanceCents: number }> {
    const toUserId = this.assertPositiveInt(input?.toUserId, 'invalid_to_user');
    const amountCents = this.assertPositiveInt(input?.amountCents, 'invalid_amount');

    let newBalanceCents = 0;

    await this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(CreditsAccount);
      const ledgerRepo = manager.getRepository(CreditsLedgerEntry);

      const receiver = await this.getOrCreateAccount(manager, toUserId);
      receiver.balanceCents += amountCents;
      const saved = await accountRepo.save(receiver);

      newBalanceCents = Number(saved.balanceCents || 0);

      // Ledger entry (accountId is REQUIRED in your DB schema)
      await ledgerRepo.save(
        ledgerRepo.create({
          accountId: saved.id,
          userId: toUserId,
          type: 'MINT',
          amountCents: amountCents,
          otherUserId: null,
          refType: 'DEV_MINT',
          refId: null,
        } as any),
      );
    });

    return { toUserId, amountCents, newBalanceCents };
  }

  // Direct send: debits sender credits, credits receiver credits, writes ledger + transfer row
  async transferCredits(input: TransferInput): Promise<CreditsTransfer> {
    const fromUserId = this.assertPositiveInt(input?.fromUserId, 'invalid_from_user');
    const toUserId = this.assertPositiveInt(input?.toUserId, 'invalid_to_user');
    const amountCents = this.assertPositiveInt(input?.amountCents, 'invalid_amount');
    if (fromUserId === toUserId) throw new BadRequestException('cannot_transfer_to_self');

    let savedTransfer!: CreditsTransfer;

    await this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(CreditsAccount);
      const ledgerRepo = manager.getRepository(CreditsLedgerEntry);
      const transferRepo = manager.getRepository(CreditsTransfer);

      const sender = await this.getOrCreateAccount(manager, fromUserId);
      if (Number(sender.balanceCents) < amountCents) throw new BadRequestException('insufficient_credits');

      sender.balanceCents -= amountCents;
      const savedSender = await accountRepo.save(sender);

      const receiver = await this.getOrCreateAccount(manager, toUserId);
      receiver.balanceCents += amountCents;
      const savedReceiver = await accountRepo.save(receiver);

      // 🔒 FIX: force single-entity save typing (prevents TS picking array overload)
      const tx = transferRepo.create({
        fromUserId,
        toUserId,
        amountCents,
        status: 'FUNDED',
        fundedCents: amountCents,
        note: input?.note ? String(input.note).slice(0, 280) : null,
      } as DeepPartial<CreditsTransfer>);

      savedTransfer = (await transferRepo.save(tx as CreditsTransfer)) as CreditsTransfer;

      await ledgerRepo.save(
        ledgerRepo.create({
          accountId: savedSender.id,
          userId: fromUserId,
          type: 'TRANSFER_OUT',
          amountCents: -amountCents,
          otherUserId: toUserId,
          refType: 'CREDITS_TRANSFER',
          refId: savedTransfer.id,
        } as any),
      );

      await ledgerRepo.save(
        ledgerRepo.create({
          accountId: savedReceiver.id,
          userId: toUserId,
          type: 'TRANSFER_IN',
          amountCents: amountCents,
          otherUserId: fromUserId,
          refType: 'CREDITS_TRANSFER',
          refId: savedTransfer.id,
        } as any),
      );
    });

    return savedTransfer;
  }

  // Request credits: creates a CreditsTransfer row in REQUESTED state
  async createRequest(input: RequestInput): Promise<CreditsTransfer> {
    const requesterUserId = this.assertPositiveInt(input?.requesterUserId, 'invalid_requester');
    const amountCents = this.assertPositiveInt(input?.amountCents, 'invalid_amount');

    const note = input?.note ? String(input.note).slice(0, 280) : null;

    // 🔒 FIX: force single-entity save typing (prevents TS picking array overload)
    const createdEntity = this.transferRepo.create({
      fromUserId: null, // no fixed payer
      toUserId: requesterUserId, // requester receives when funded
      amountCents,
      fundedCents: 0,
      status: 'REQUESTED',
      note,
    } as DeepPartial<CreditsTransfer>);

    const created = (await this.transferRepo.save(createdEntity as CreditsTransfer)) as CreditsTransfer;
    return created as CreditsTransfer;
  }

  // Fund a request (partial allowed)
  async fundRequest(input: FundRequestInput): Promise<CreditsTransfer> {
    const requestId = this.assertPositiveInt(input?.requestId, 'invalid_request_id');
    const funderUserId = this.assertPositiveInt(input?.funderUserId, 'invalid_funder');
    const amountCents = this.assertPositiveInt(input?.amountCents, 'invalid_amount');

    let updated!: CreditsTransfer;

    await this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(CreditsAccount);
      const ledgerRepo = manager.getRepository(CreditsLedgerEntry);
      const transferRepo = manager.getRepository(CreditsTransfer);

      const req = await transferRepo.findOne({ where: { id: requestId } });
      if (!req) throw new NotFoundException('request_not_found');

      const status = String((req as any).status || '').toUpperCase();
      if (status !== 'REQUESTED' && status !== 'FUNDED') {
        throw new BadRequestException('invalid_request_status');
      }

      const toUserId = Number((req as any).toUserId);
      if (!Number.isFinite(toUserId) || toUserId <= 0) throw new BadRequestException('invalid_request_receiver');
      if (toUserId === funderUserId) throw new BadRequestException('cannot_fund_self');

      const alreadyFunded = Number((req as any).fundedCents || 0);
      const total = Number((req as any).amountCents || 0);

      const remaining = Math.max(0, total - alreadyFunded);
      if (remaining <= 0) throw new BadRequestException('request_already_fulfilled');

      // hard cap
      const fundNow = Math.min(amountCents, remaining);

      const funder = await this.getOrCreateAccount(manager, funderUserId);
      if (Number(funder.balanceCents) < fundNow) throw new BadRequestException('insufficient_credits');

      // Debit funder
      funder.balanceCents -= fundNow;
      const savedFunder = await accountRepo.save(funder);

      // Credit receiver
      const receiver = await this.getOrCreateAccount(manager, toUserId);
      receiver.balanceCents += fundNow;
      const savedReceiver = await accountRepo.save(receiver);

      // Update request aggregate
      (req as any).fundedCents = alreadyFunded + fundNow;
      (req as any).status = (alreadyFunded + fundNow) >= total ? 'FUNDED' : 'REQUESTED';

      // Optional: keep last funder hint
      updated = (await transferRepo.save(req as CreditsTransfer)) as CreditsTransfer;

      await ledgerRepo.save(
        ledgerRepo.create({
          accountId: savedFunder.id,
          userId: funderUserId,
          type: 'REQUEST_FUND_OUT',
          amountCents: -fundNow,
          otherUserId: toUserId,
          refType: 'CREDITS_REQUEST',
          refId: updated.id,
        } as any),
      );

      await ledgerRepo.save(
        ledgerRepo.create({
          accountId: savedReceiver.id,
          userId: toUserId,
          type: 'REQUEST_FUND_IN',
          amountCents: fundNow,
          otherUserId: funderUserId,
          refType: 'CREDITS_REQUEST',
          refId: updated.id,
        } as any),
      );
    });

    return updated;
  }
}

