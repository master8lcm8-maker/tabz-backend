// src/modules/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',                     // 🔥 REQUIRED
  transports: ['websocket', 'polling'] // 🔥 Ensures Expo Web + mobile work
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // --------------------------------------------------
  // CONNECTION LOGGING
  // --------------------------------------------------
  handleConnection(client: any) {
    console.log('🔥 WebSocket client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('❌ WebSocket client disconnected:', client.id);
  }

  // --------------------------------------------------
  // ORDER EVENTS
  // --------------------------------------------------
  emitOrderCreated(order: any) {
    this.server.emit('order.created', { ...order });
  }

  emitOrderUpdated(order: any) {
    this.server.emit('order.updated', { ...order });
  }

  // --------------------------------------------------
  // WALLET UPDATED
  // --------------------------------------------------
  emitWalletUpdated(payload: {
    userId: number;
    walletId: number;
    balanceCents: number;
    spendableBalanceCents: number;
    cashoutAvailableCents: number;
  }) {
    this.server.emit('wallet.updated', { ...payload });
  }

  // --------------------------------------------------
  // CASHOUT CREATED
  // --------------------------------------------------
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

  // --------------------------------------------------
  // CASHOUT UPDATED
  // --------------------------------------------------
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
