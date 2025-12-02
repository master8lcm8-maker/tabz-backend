import { Module } from '@nestjs/common';
import { DevSeedController } from './dev-seed.controller';
import { StoreItemsModule } from '../modules/store-items/store-items.module';

@Module({
  imports: [StoreItemsModule],
  controllers: [DevSeedController],
})
export class DevSeedModule {}

