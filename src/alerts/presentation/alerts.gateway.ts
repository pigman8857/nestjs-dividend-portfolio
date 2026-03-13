import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { AlertTriggeredEvent } from '../infrastructure/alert-change-stream.listener';

@WebSocketGateway({ cors: true })
export class AlertsGateway {
  @WebSocketServer()
  server: Server;

  @OnEvent('alert.triggered')
  handleAlertTriggered(event: AlertTriggeredEvent): void {
    this.server.emit('alert.triggered', event);
  }
}
