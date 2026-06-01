import { BadRequestException, Injectable } from '@nestjs/common';
import { DrinksService } from '../drinks/drinks.service';
import { FreeboardService } from '../freeboard/freeboard.service';
import { StoreItemsService } from '../store-items/store-items.service';

export type QrKind = 'drink' | 'freeboard';

@Injectable()
export class QrService {
  constructor(
    private readonly drinksService: DrinksService,
    private readonly freeboardService: FreeboardService,
    private readonly storeItemsService: StoreItemsService,
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

  // QR_STAFF_QUEUE_FACADE_26O6
  async getStaffQueue(input: { role?: string; venueId?: unknown }) {
    const role = String(input?.role || '').toLowerCase();
    if (role !== 'staff') {
      throw new BadRequestException('Only staff can view QR staff queue.');
    }

    const venueId = Number(input?.venueId);
    if (!Number.isInteger(venueId) || venueId <= 0) {
      throw new BadRequestException('Invalid venueId on staff token.');
    }

    const orders = await this.storeItemsService.findOrdersForStaff(venueId);

    return {
      ok: true,
      source: 'store-items/staff/orders',
      facade: 'qr/staff/queue',
      venueId,
      total: Array.isArray(orders) ? orders.length : 0,
      value: orders,
    };
  }
}

