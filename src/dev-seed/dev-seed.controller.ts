import { Controller, Post } from '@nestjs/common';
import { StoreItemsService } from '../modules/store-items/store-items.service';

@Controller('dev-seed')
export class DevSeedController {
  constructor(
    private readonly storeItemsService: StoreItemsService,
  ) {}

  // Simple dev endpoint to ensure a demo item exists
  @Post('ensure-test-item')
  async ensureTestItem() {
    const items = await this.storeItemsService.findAllItems();

    let item = items.find((i) => i.name === 'Test Drink');
    if (!item) {
      item = await this.storeItemsService.createItem({
        name: 'Test Drink',
        priceCents: 1000,
        venueId: 1,
        metadata: null,
      });
    }

    return item;
  }
}
