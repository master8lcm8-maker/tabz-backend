import { Module } from '@nestjs/common';
import { DrinksModule } from '../drinks/drinks.module';
import { FreeboardModule } from '../freeboard/freeboard.module';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';

@Module({
  imports: [DrinksModule, FreeboardModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
