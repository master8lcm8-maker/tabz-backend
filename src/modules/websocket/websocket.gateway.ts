// src/modules/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

function buildCorsAllowSet(): Set<string> {
  // Optional: production-safe list via env (comma separated)
  // Example:
  // TABZ_CORS_ORIGINS="https://8tabz.com,https://www.8tabz.com,http://localhost:19006"
  const env = (process.env.TABZ_CORS_ORIGINS || '').trim();
  if (env) {
    return new Set(
      env
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    );
  }

  // Fallback: dev allowlist (matches src/app/main.ts)
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
      // allow non-browser callers (mobile native, server-to-server)
      if (!origin) return cb(null, true);

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
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('WebSocket client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('WebSocket client disconnected:', client.id);
  }

  emitOrderCreated(order: any) {
    this.server.emit('order.created', { ...order });
  }

  emitOrderUpdated(order: any) {
    this.server.emit('order.updated', { ...order });
  }

  emitWalletUpdated(payload: {
    userId: number;
    walletId: number;
    balanceCents: number;
    spendableBalanceCents: number;
    cashoutAvailableCents: number;
  }) {
    this.server.emit('wallet.updated', { ...payload });
  }

  emitCashoutCreated(cashout: any) {
    this.server.emit('cashout.created', {
      id: cashout.id,
      walletId: cashout.walletId,
      amountCents: cashout.amountCents,
      status: cashout.status,
      failureReason: cashout.failureReason,
      destinationLast4: cashout.destinationLast4,
      createdAt: cashout.createdAt,
      updatedAt: cashout.updatedAt,
    });
  }

  emitCashoutUpdated(cashout: any) {
    this.server.emit('cashout.updated', {
      id: cashout.id,
      walletId: cashout.walletId,
      amountCents: cashout.amountCents,
      status: cashout.status,
      failureReason: cashout.failureReason,
      destinationLast4: cashout.destinationLast4,
      createdAt: cashout.createdAt,
      updatedAt: cashout.updatedAt,
    });
  }
}
