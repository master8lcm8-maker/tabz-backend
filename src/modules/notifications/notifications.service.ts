import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken, PushTokenPlatform } from './push-token.entity';
import {
  Notification,
  NotificationAudience,
  NotificationStatus,
  NotificationType,
} from './notification.entity';

export interface CreateNotificationInput {
  userId: number;
  audience?: NotificationAudience;
  type: NotificationType;
  title: string;
  body?: string | null;
  sourceType?: string | null;
  sourceId?: number | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(PushToken)
    private readonly pushTokensRepo: Repository<PushToken>,
  ) {}

  private assertPositiveInt(value: unknown, field: string): number {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new BadRequestException(field);
    }
    return n;
  }

  private normalizeLimit(input: unknown, fallback = 25, max = 100): number {
    const n = Number(input ?? fallback);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.floor(n), max);
  }

  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const userId = this.assertPositiveInt(input?.userId, 'user_id_required');
    const title = String(input?.title || '').trim();
    if (!title) {
      throw new BadRequestException('notification_title_required');
    }

    const notification = this.notificationsRepo.create({
      userId,
      audience: input.audience || 'user',
      type: input.type,
      status: 'unread',
      title: title.slice(0, 160),
      body: input.body ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      metadata: input.metadata ?? null,
    });

    return this.notificationsRepo.save(notification);
  }

  async listForUser(userIdInput: unknown, limitInput?: unknown): Promise<{
    total: number;
    unreadCount: number;
    items: Notification[];
  }> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');
    const limit = this.normalizeLimit(limitInput);

    const [items, total] = await this.notificationsRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const unreadCount = await this.notificationsRepo.count({
      where: { userId, status: 'unread' },
    });

    return { total, unreadCount, items };
  }

  async unreadForUser(userIdInput: unknown, limitInput?: unknown): Promise<{
    total: number;
    items: Notification[];
  }> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');
    const limit = this.normalizeLimit(limitInput);

    const [items, total] = await this.notificationsRepo.findAndCount({
      where: { userId, status: 'unread' },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return { total, items };
  }

  async countForUser(userIdInput: unknown): Promise<{ unreadCount: number; total: number }> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');

    const [unreadCount, total] = await Promise.all([
      this.notificationsRepo.count({ where: { userId, status: 'unread' } }),
      this.notificationsRepo.count({ where: { userId } }),
    ]);

    return { unreadCount, total };
  }

  async markRead(userIdInput: unknown, idInput: unknown): Promise<Notification> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');
    const id = this.assertPositiveInt(idInput, 'notification_id_required');

    const notification = await this.notificationsRepo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('notification_not_found');
    }

    notification.status = 'read' as NotificationStatus;
    return this.notificationsRepo.save(notification);
  }

  async markAllRead(userIdInput: unknown): Promise<{ updated: number }> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');

    const result = await this.notificationsRepo.update(
      { userId, status: 'unread' },
      { status: 'read' as NotificationStatus },
    );

    return { updated: result.affected || 0 };
  }

  // PUSH_TOKEN_REGISTRATION_26N8
  private normalizePushPlatform(input: unknown): PushTokenPlatform {
    const value = String(input || 'unknown').toLowerCase();
    if (value === 'ios' || value === 'android' || value === 'web') {
      return value;
    }
    return 'unknown';
  }

  async registerPushToken(userIdInput: unknown, input: any): Promise<PushToken> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');
    const token = String(input?.token || '').trim();

    if (!token || token.length < 12 || token.length > 512) {
      throw new BadRequestException('valid_push_token_required');
    }

    const existing = await this.pushTokensRepo.findOne({ where: { token } });

    const payload = {
      userId,
      token,
      platform: this.normalizePushPlatform(input?.platform),
      deviceId: input?.deviceId ? String(input.deviceId).slice(0, 160) : null,
      isActive: true,
      metadata: input?.metadata ?? null,
    };

    if (existing) {
      Object.assign(existing, payload);
      return this.pushTokensRepo.save(existing);
    }

    return this.pushTokensRepo.save(this.pushTokensRepo.create(payload));
  }

  async listPushTokens(userIdInput: unknown): Promise<{ total: number; items: PushToken[] }> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');
    const items = await this.pushTokensRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return { total: items.length, items };
  }

  async deactivatePushToken(userIdInput: unknown, idInput: unknown): Promise<PushToken> {
    const userId = this.assertPositiveInt(userIdInput, 'user_id_required');
    const id = this.assertPositiveInt(idInput, 'push_token_id_required');

    const token = await this.pushTokensRepo.findOne({ where: { id, userId } });
    if (!token) {
      throw new NotFoundException('push_token_not_found');
    }

    token.isActive = false;
    return this.pushTokensRepo.save(token);
  }
}

