import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { StoreItemsService } from './store-items.service';

class CreateStoreItemDto {
  name: string;
  priceCents: number;
  venueId?: number | null;
  metadata?: any;
}

@Controller('admin/store-items')
export class StoreItemsAdminController {
  constructor(
    private readonly storeItemsService: StoreItemsService,
  ) {}

  @Post()
  async createStoreItem(@Body() dto: CreateStoreItemDto) {
    if (!dto.name || !dto.priceCents) {
      throw new BadRequestException('Missing required name or priceCents.');
    }

    // If no venueId passed, you can default to 1 or null; here we keep null
    const venueId = dto.venueId ?? 1;

    return this.storeItemsService.createItem({
      name: dto.name,
      priceCents: dto.priceCents,
      venueId,
      metadata: dto.metadata,
    });
  }
}
