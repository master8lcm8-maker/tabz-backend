// src/modules/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

type WalletUpdatedPayload = {
  userId: number;
  walletId: number;
  balanceCents: number;
  spendableBalanceCents: number;
  cashoutAvailableCents: number;
};

function buildCorsAllowSet(): Set<string> {
  // Production-safe list via env (comma separated)
  // Example:
  // TABZ_CORS_ORIGINS="https://8tabz.com,https://www.8tabz.com,http://localhost:19006"
  const env = (process.env.TABZ_CORS_ORIGINS || '').trim();
  if (env) {
    return new Set(
      env
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  // Fallback: dev allowlist (keep aligned with src/app/main.ts)
  return new Set([
    'http://localhost:19006',
    'http://localhost:8081',
    'http://127.0.0.1:19006',
    'http://127.0.0.1:8081',
    'http://10.0.0.239:19006',
    'http://10.0.0.239:8081',
  ]);
}

@WebSocketGateway({
  cors: {
    origin: (origin, cb) => {
      // Allow non-browser callers (native mobile, server-to-server)
      if (!origin) return cb(null, true);

      // Build allow-set per request so runtime env changes take effect without restart.
      // (Cost is tiny; if you want caching, we can add it later.)
      const allow = buildCorsAllowSet();
      return allow.has(origin) ? cb(null, true) : cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'Cache-Control',
      'Pragma',
      'If-None-Match',
      'x-dev-seed-secret',
    ],
  },
  // root namespace
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebsocketGateway.name);

  @WebSocketServer()
  server?: Server;

  handleConnection(client: any) {
    // socket.io client has id, handshake, etc.
    this.logger.log(`WebSocket client connected: ${client?.id ?? '(no id)'}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`WebSocket client disconnected: ${client?.id ?? '(no id)'}`);
  }

  // ---- internal helpers ----
  private safeEmit(event: string, payload: unknown): void {
    // Prevent runtime crashes if emit happens before socket server is ready
    if (!this.server) {
      // Do NOT throw; just log once per call. If this happens a lot, caller is firing too early.
      this.logger.warn(`WS emit skipped (server not ready): event="${event}"`);
      return;
    }
    this.server.emit(event, payload);
  }

  // ---- public emitters (used by services) ----
  emitOrderCreated(order: any) {
    this.safeEmit('order.created', { ...order });
  }

  emitOrderUpdated(order: any) {
    this.safeEmit('order.updated', { ...order });
  }

  emitWalletUpdated(payload: WalletUpdatedPayload) {
    this.safeEmit('wallet.updated', { ...payload });
  }

  emitCashoutCreated(cashout: any) {
    this.safeEmit('cashout.created', {
      id: cashout?.id,
      walletId: cashout?.walletId,
      amountCents: cashout?.amountCents,
      status: cashout?.status,
      failureReason: cashout?.failureReason,
      destinationLast4: cashout?.destinationLast4,
      createdAt: cashout?.createdAt,
      updatedAt: cashout?.updatedAt,
    });
  }

  emitCashoutUpdated(cashout: any) {
    this.safeEmit('cashout.updated', {
      id: cashout?.id,
      walletId: cashout?.walletId,
      amountCents: cashout?.amountCents,
      status: cashout?.status,
      failureReason: cashout?.failureReason,
      destinationLast4: cashout?.destinationLast4,
      createdAt: cashout?.createdAt,
      updatedAt: cashout?.updatedAt,
    });
  }
}
