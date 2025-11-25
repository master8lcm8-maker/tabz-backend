import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('qr')
export class QrController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getQrTest() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, type: 'freeboard-claim', code: 'QR-TEST-1' },
      { id: 2, type: 'drink-redeem', code: 'QR-TEST-2' },
    ];
  }
}
