// src/modules/store-items/store-items-admin.controller.ts
import { Body, BadRequestException, Controller, Post } from '@nestjs/common';
import { StoreItemsService } from './store-items.service';

type CreateStoreItemDto = {
  name: string;
  priceCents: number;
  venueId?: number | null;

  // NOTE: entity StoreItem does NOT define metadata.
  // Keeping it in DTO is fine for backwards-compat payloads,
  // but we do NOT persist it unless/until the entity/service supports it.
  metadata?: any;
};

@Controller('admin/store-items')
export class StoreItemsAdminController {
  constructor(private readonly storeItemsService: StoreItemsService) {}

  @Post()
  async createStoreItem(@Body() dto: CreateStoreItemDto) {
    const name = String(dto?.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Missing required "name".');
    }

    // IMPORTANT: don’t use `!dto.priceCents` (0 is valid in JS falsy land)
    if (dto?.priceCents === null || dto?.priceCents === undefined) {
      throw new BadRequestException('Missing required "priceCents".');
    }

    const priceCents = Number(dto.priceCents);
    if (
      !Number.isFinite(priceCents) ||
      !Number.isInteger(priceCents) ||
      priceCents < 0
    ) {
      throw new BadRequestException('"priceCents" must be a non-negative integer.');
    }

    // If not passed, keep null (global item)
    const venueId =
      dto?.venueId === undefined ? null : dto.venueId === null ? null : Number(dto.venueId);

    if (venueId !== null) {
      if (!Number.isFinite(venueId) || !Number.isInteger(venueId) || venueId <= 0) {
        throw new BadRequestException('"venueId" must be a positive integer or null.');
      }
    }

    // ✅ FIX: Do NOT pass metadata — StoreItem entity has no metadata field,
    // and your service/create() currently fails TS when metadata is present.
    return this.storeItemsService.createItem({
      name,
      priceCents,
      venueId,
    } as any);
  }
}
