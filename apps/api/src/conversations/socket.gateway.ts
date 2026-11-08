import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: true } })
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  handleConnection(client: Socket) {
    const shopId = client.handshake.query?.shopId as string | undefined;
    if (shopId) {
      client.join(`shop:${shopId}`);
      this.logger.log(`socket connected: shop=${shopId} id=${client.id}`);
    }
  }

  /** Broadcast to a shop's admin clients (new message / order / notification). */
  emitToShop(shopId: string, event: string, payload: unknown) {
    this.server.to(`shop:${shopId}`).emit(event, payload);
  }
}
