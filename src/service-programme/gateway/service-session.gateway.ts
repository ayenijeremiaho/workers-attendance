import {
    ConnectedSocket,
    MessageBody,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import {SessionAnchor} from '../service/service-session.service';
import {ServiceSession} from '../entity/service-session.entity';

interface JoinSessionPayload {
    sessionCode: string;
}

@WebSocketGateway({namespace: '/service-session', cors: {origin: '*'}})
export class ServiceSessionGateway implements OnGatewayInit {
    @WebSocketServer()
    server: Server;

    afterInit() {}

    @SubscribeMessage('joinSession')
    handleJoin(@MessageBody() payload: JoinSessionPayload, @ConnectedSocket() client: Socket): void {
        if (!payload?.sessionCode) return;
        client.join(this.roomKey(payload.sessionCode));
    }

    @SubscribeMessage('leaveSession')
    handleLeave(@MessageBody() payload: JoinSessionPayload, @ConnectedSocket() client: Socket): void {
        if (!payload?.sessionCode) return;
        client.leave(this.roomKey(payload.sessionCode));
    }

    broadcastState(sessionCode: string, anchor: SessionAnchor, session: Partial<ServiceSession>): void {
        this.server.to(this.roomKey(sessionCode)).emit('session:state', {anchor, session});
    }

    private roomKey(sessionCode: string): string {
        return `session:${sessionCode}`;
    }
}
