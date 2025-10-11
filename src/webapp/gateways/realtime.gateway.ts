import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('RealtimeGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client sends { type: 'seller'|'user', id: string|number }
  @SubscribeMessage('subscribe')
  onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const type = payload?.type === 'seller' ? 'seller' : 'user';
    const id = String(payload?.id || '');
    if (!id) return;
    const room = `${type}:${id}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }

  emitToSeller(sellerId: number | string, event: string, data: any) {
    const room = `seller:${sellerId}`;
    this.server.to(room).emit(event, data);
  }

  emitToUser(userId: number | string, event: string, data: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, data);
  }
}


