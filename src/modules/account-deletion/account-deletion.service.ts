import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomBytes } from 'crypto';

@Injectable()
export class AccountDeletionService {
  constructor(private readonly ds: DataSource) {}

  async requestDeletion(userId: number, reason?: string, ip?: string, userAgent?: string) {
    const token = randomBytes(24).toString('hex').toUpperCase();

    await this.ds.query(
      'INSERT INTO account_deletion_requests ("userId","status","requestToken","requestedAt","ip","userAgent") VALUES ($1,$2,$3,now(),$4,$5)',
      [userId, 'REQUESTED', token, ip ?? null, userAgent ?? null]
    );

    return { ok: true, confirmToken: token };
  }

  async confirmDeletion(userId: number, token: string, reason?: string) {
    if (!token || token.length < 10) throw new BadRequestException('Invalid token');

    const rows = await this.ds.query(
      'SELECT id, "userId", status FROM account_deletion_requests WHERE "requestToken" = $1 LIMIT 1',
      [token]
    );
    const r = rows?.[0];
    if (!r) throw new BadRequestException('Token not found');
    if (Number(r.userId) !== Number(userId)) throw new ForbiddenException('Token does not belong to this user');
    if (String(r.status) !== 'REQUESTED') throw new BadRequestException('Token already used');

    await this.ds.transaction(async (tx) => {
      await tx.query(
        'UPDATE "users" SET "deletedAt" = now(), "anonymizedAt" = now(), "deletionReason" = $2 WHERE id = $1',
        [userId, reason ?? null]
      );

      await tx.query(
        'UPDATE account_deletion_requests SET status = $1, "confirmedAt" = now() WHERE id = $2',
        ['CONFIRMED', r.id]
      );
    });

    return { ok: true };
  }
}
