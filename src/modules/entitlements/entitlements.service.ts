import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DrinkOrder } from '../drinks/entities/drink-order.entity';
import { FreeboardDrop } from '../freeboard/freeboard-drop.entity';
import { FoodOrder } from '../foods/entities/food-order.entity';

export type EntitlementKind = 'drink' | 'freeboard' | 'food';

export interface EntitlementView {
  id: string;
  kind: EntitlementKind;
  sourceId: number;
  title: string;
  status: string;
  code: string | null;
  venueId: number | null;
  ownerUserId: number | null;
  amountCents: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  redeemedAt?: Date | string | null;
  claimedAt?: Date | string | null;
}

@Injectable()
export class EntitlementsService {
  constructor(
    @InjectRepository(DrinkOrder)
    private readonly drinkOrdersRepo: Repository<DrinkOrder>,

    @InjectRepository(FreeboardDrop)
    private readonly freeboardRepo: Repository<FreeboardDrop>,

    @InjectRepository(FoodOrder)
    private readonly foodOrdersRepo: Repository<FoodOrder>,
  ) {}

  async listMine(userId: number): Promise<EntitlementView[]> {
    if (!Number.isFinite(userId) || userId <= 0) {
      return [];
    }

    const [drinks, freeboardDrops, foods] = await Promise.all([
      this.drinkOrdersRepo.find({
        where: { buyerId: userId } as any,
        order: { createdAt: 'DESC' } as any,
        take: 100,
      }),
      this.freeboardRepo.find({
        where: { claimedByUserId: userId } as any,
        order: { claimedAt: 'DESC', createdAt: 'DESC' } as any,
        take: 100,
      }),
      this.foodOrdersRepo.find({
        where: [
          { senderId: userId } as any,
          { recipientId: userId } as any,
        ],
        order: { createdAt: 'DESC' } as any,
        take: 100,
      }),
    ]);

    return [
      ...drinks.map((order) => this.mapDrink(order)),
      ...freeboardDrops.map((drop) => this.mapFreeboard(drop)),
      ...foods.map((order) => this.mapFood(order)),
    ].sort((a, b) => {
      const aTime = new Date(String(a.updatedAt || a.createdAt || 0)).getTime();
      const bTime = new Date(String(b.updatedAt || b.createdAt || 0)).getTime();
      return bTime - aTime;
    });
  }

  private mapDrink(order: DrinkOrder): EntitlementView {
    return {
      id: `drink:${order.id}`,
      kind: 'drink',
      sourceId: Number(order.id),
      title: String((order as any).drinkName || 'Drink entitlement'),
      status: String((order as any).status || ''),
      code: String((order as any).redemptionCode || '') || null,
      venueId: Number((order as any).venueId || 0) || null,
      ownerUserId: Number((order as any).buyerId || 0) || null,
      amountCents: Number((order as any).priceCents || 0) || null,
      createdAt: (order as any).createdAt ?? null,
      updatedAt: (order as any).updatedAt ?? null,
      redeemedAt: (order as any).redeemedAt ?? null,
    };
  }

  private mapFreeboard(drop: FreeboardDrop): EntitlementView {
    return {
      id: `freeboard:${drop.id}`,
      kind: 'freeboard',
      sourceId: Number(drop.id),
      title: String((drop as any).title || 'FreeBoard entitlement'),
      status: String((drop as any).status || ''),
      code: String((drop as any).claimCode || '') || null,
      venueId: Number((drop as any).venueId || 0) || null,
      ownerUserId: Number((drop as any).claimedByUserId || 0) || null,
      amountCents: Number((drop as any).rewardCents || 0) || null,
      createdAt: (drop as any).createdAt ?? null,
      updatedAt: (drop as any).updatedAt ?? null,
      claimedAt: (drop as any).claimedAt ?? null,
    };
  }

  private mapFood(order: FoodOrder): EntitlementView {
    return {
      id: `food:${order.id}`,
      kind: 'food',
      sourceId: Number(order.id),
      title: String((order as any).foodName || 'Food entitlement'),
      status: String((order as any).status || ''),
      code: String((order as any).redemptionCode || '') || null,
      venueId: Number((order as any).venueId || 0) || null,
      ownerUserId:
        Number((order as any).recipientId || 0) ||
        Number((order as any).senderId || 0) ||
        null,
      amountCents: Number((order as any).amountCents || 0) || null,
      createdAt: (order as any).createdAt ?? null,
      updatedAt: (order as any).updatedAt ?? null,
      redeemedAt: (order as any).redeemedAt ?? null,
    };
  }
}
