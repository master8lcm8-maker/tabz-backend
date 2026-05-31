import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { QrService } from '../qr/qr.service';
import { FoodsService } from '../foods/foods.service';

export type GenericRedemptionKind = 'drink' | 'freeboard' | 'food';

export interface GenericRedemptionInput {
  code: string;
  kind: string;
  userId: number;
  role: string;
}

@Injectable()
export class RedemptionsService {
  constructor(
    private readonly qrService: QrService,
    private readonly foodsService: FoodsService,
  ) {}

  async redeem(input: GenericRedemptionInput): Promise<any> {
    const code = String(input?.code || '').trim();
    const kind = this.normalizeKind(input?.kind);
    const role = String(input?.role || '').toLowerCase();
    const userId = Number(input?.userId || 0);

    if (!code) {
      throw new BadRequestException('Redemption code is required.');
    }

    if (kind === 'drink' || kind === 'freeboard') {
      return this.qrService.redeem({
        code,
        kind,
        userId,
        role,
      });
    }

    if (kind === 'food') {
      if (role !== 'staff') {
        throw new ForbiddenException('forbidden');
      }

      const result = await this.foodsService.redeemByCode(code);

      return {
        ok: true,
        kind: 'food',
        action: 'redeemed',
        value: result,
      };
    }

    throw new BadRequestException(
      'Unsupported redemption kind. Supported redemption kinds are: drink, freeboard, food.',
    );
  }

  private normalizeKind(value?: string): GenericRedemptionKind | 'unsupported' {
    const kind = String(value || '').trim().toLowerCase();

    if (kind === 'drink' || kind === 'drinks') {
      return 'drink';
    }

    if (kind === 'freeboard' || kind === 'freeboard-drop' || kind === 'drop') {
      return 'freeboard';
    }

    if (kind === 'food' || kind === 'foods') {
      return 'food';
    }

    return 'unsupported';
  }
}
