import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StoreItemsService } from './store-items.service';

@Controller('store-items')
export class StoreItemsController {
  private readonly logger = new Logger(StoreItemsController.name);

  constructor(
    private readonly storeItemsService: StoreItemsService,
    private readonly jwtService: JwtService, // kept injected but no longer used
  ) {}

  private extractUserIdFromAuthHeader(authHeader?: string): number {
    this.logger.log(`[extractUserId] raw Authorization header: ${authHeader}`);

    if (!authHeader) {
      this.logger.error('[extractUserId] Missing Authorization header');
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      this.logger.error(
        `[extractUserId] Invalid Authorization format: ${authHeader}`,
      );
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        throw new Error('Malformed JWT');
      }

      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload: any = JSON.parse(payloadJson);

      this.logger.log(
        `[extractUserId] JWT payload = ${JSON.stringify(payload)}`,
      );

      const userId = payload?.sub;
      if (!userId) {
        this.logger.error(
          '[extractUserId] Token payload missing "sub" (user id)',
        );
        throw new UnauthorizedException('Token payload missing sub');
      }

      this.logger.log(`[extractUserId] Resolved userId = ${userId}`);
      return Number(userId);
    } catch (err) {
      this.logger.error(
        `[extractUserId] Failed to decode JWT: ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('order')
  async createOrder(
    @Headers('authorization') authHeader: string,
    @Body() body: any,
  ) {
    const userId = this.extractUserIdFromAuthHeader(authHeader);

    this.logger.log(
      `[createOrder] userId = ${userId}, body = ${JSON.stringify(body)}`,
    );

    if (!body?.itemId || !body?.quantity) {
      this.logger.error(
        `[createOrder] Missing itemId or quantity in body: ${JSON.stringify(
          body,
        )}`,
      );
      throw new BadRequestException('itemId and quantity are required');
    }

    return this.storeItemsService.createOrderForUser(userId, body);
  }

  @Patch('order/:id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    this.logger.log(
      `[updateOrderStatus] id=${id}, status=${body?.status}`,
    );
    return this.storeItemsService.updateOrderStatus(id, body?.status);
  }

  @Get('venue-orders')
  async getVenueOrders(@Headers('authorization') authHeader: string) {
    this.logger.log('[getVenueOrders] Incoming request');

    const userId = this.extractUserIdFromAuthHeader(authHeader);

    this.logger.log(
      `[getVenueOrders] Using userId = ${userId} to fetch venue orders`,
    );

    const result = await this.storeItemsService.getVenueOrdersForUser(userId);

    this.logger.log(
      `[getVenueOrders] Result count = ${
        Array.isArray(result) ? result.length : 'unknown'
      }`,
    );

    return result;
  }

  @Post()
  async createItem(@Body() body: any) {
    this.logger.log(`[createItem] body = ${JSON.stringify(body)}`);

    if (!body) {
      this.logger.warn('[createItem] Empty request body');
    }

    return this.storeItemsService.createItem(body);
  }

  @Get()
  async findAllItems() {
    this.logger.log('[findAllItems] Fetching all items');
    return this.storeItemsService.findAllItems();
  }

  @Get(':id')
  async findOneItem(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`[findOneItem] id = ${id}`);
    return this.storeItemsService.findOneItem(id);
  }

  @Patch(':id')
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    this.logger.log(
      `[updateItem] id = ${id}, body = ${JSON.stringify(body)}`,
    );
    return this.storeItemsService.updateItem(id, body);
  }

  @Delete(':id')
  async removeItem(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`[removeItem] id = ${id}`);
    return this.storeItemsService.removeItem(id);
  }
}
