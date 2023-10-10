import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/interfaces';
import { NewMessageDto } from './dtos/new-message.dto';
import { MessageWsService } from './messages-ws.service';

@WebSocketGateway({ cors: true })
export class MessageWsGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() wss: Server;
  constructor(
    private readonly messageWsService: MessageWsService,
    private readonly jwtService: JwtService
  ) { }

  async handleConnection( client: Socket ) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(token);
      await this.messageWsService.registerClient(client, payload.id);

    } catch (error) {
      console.error(error);
      client.disconnect();
      return;
    }

    // console.log('Cliente conectado', {
    //   clientId: client.id,
    //   clientesConectados: this.messageWsService.getConnectedClients()
    // });

    this.wss.emit('clients-updated', this.messageWsService.getConnectedClients());
  }

  handleDisconnect(client: Socket) {
    console.log('Cliente desconectado.', client.id);
    this.messageWsService.removeClient(client.id);
    this.wss.emit('clients-updated', this.messageWsService.getConnectedClients());
  }

  @SubscribeMessage('message-from-client')
  onMessageFromClient(client: Socket, payload: NewMessageDto) {

    console.log('_________onMessageFromClient:')
    console.log({
      clientId: client.id,
      payload: payload
    });

    //! Emite únicamente al cliente.
    // client.emit('message-from-server', {
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no-message!!'
    // });

    //! Emitir a todos MENOS, al cliente inicial
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no-message!!'
    // });

    this.wss.emit('message-from-server', {
      fullName: this.messageWsService.getUserFullName(client.id),
      message: payload.message || 'no-message!!'
    });
  }
}
