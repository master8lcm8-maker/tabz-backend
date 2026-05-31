import { BadRequestException, Injectable } from '@nestjs/common';
import { DrinksService } from '../drinks/drinks.service';
import { FreeboardService } from '../freeboard/freeboard.service';

export type QrKind = 'drink' | 'freeboard';

@Injectable()
export class QrService {
  constructor(
    private readonly drinksService: DrinksService,
    private readonly freeboardService: FreeboardService,
  ) {}

  scan(input: { code?: string; kind?: string }) {
    const code = this.normalizeCode(input.code);
    const kind = this.normalizeKind(input.kind);

    return {
      ok: true,
      code,
      kind,
      supportedKinds: ['drink', 'freeboard'],
      unsupportedKinds: ['store-items', 'foods', 'entitlements', 'redemptions'],
      message:
        kind === 'drink' || kind === 'freeboard'
          ? 'QR code is supported by the current TABZ redemption facade.'
          : 'QR code kind was not provided or is not supported yet.',
    };
  }

  async redeem(input: {
    userId: number;
    role?: string | null;
    code?: string;
    kind?: string;
  }) {
    const code = this.normalizeCode(input.code);
    const kind = this.normalizeKind(input.kind);
    const role = String(input.role ?? '').toLowerCase().trim();

    if (kind === 'drink') {
      if (role !== 'staff') {
        throw new BadRequestException('Only staff can redeem drink QR codes.');
      }

      const result = await this.drinksService.redeemOrderByCode(code);

      return {
        ok: true,
        kind: 'drink',
        action: 'redeemed',
        result,
      };
    }

    if (kind === 'freeboard') {
      const userId = Number(input.userId);

      if (!Number.isInteger(userId) || userId <= 0) {
        throw new BadRequestException('Valid userId is required to claim FreeBoard QR codes.');
      }

      const result = await this.freeboardService.claimDrop({
        userId,
        code,
      });

      return {
        ok: true,
        kind: 'freeboard',
        action: 'claimed',
        result,
      };
    }

    throw new BadRequestException(
      'Unsupported QR kind. Supported QR kinds are: drink, freeboard.',
    );
  }

  private normalizeCode(value?: string): string {
    const code = String(value ?? '').trim();

    if (!code) {
      throw new BadRequestException('QR code is required.');
    }

    return code;
  }

  private normalizeKind(value?: string): QrKind | 'unsupported' {
    const kind = String(value ?? '').toLowerCase().trim();

    if (kind === 'drink' || kind === 'drinks') {
      return 'drink';
    }

    if (kind === 'freeboard' || kind === 'freeboard-drop' || kind === 'drop') {
      return 'freeboard';
    }

    return 'unsupported';
  }
}
