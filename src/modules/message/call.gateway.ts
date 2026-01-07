import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected to CallGateway: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected from CallGateway: ${client.id}`);
    }

    @SubscribeMessage('joinCall')
    handleJoinCall(client: Socket, payload: { conversationId: string; userId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        client.join(roomName);
        console.log(`User ${payload.userId} joined call room ${roomName}`);
        client.emit('joinedCall', { conversationId: payload.conversationId });
    }

    @SubscribeMessage('offer')
    handleOffer(client: Socket, payload: { conversationId: string; offer: any; toUserId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`Sending offer to room ${roomName}`);
        client.to(roomName).emit('offer', payload);
    }

    @SubscribeMessage('answer')
    handleAnswer(client: Socket, payload: { conversationId: string; answer: any; toUserId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`Sending answer to room ${roomName}`);
        client.to(roomName).emit('answer', payload);
    }

    @SubscribeMessage('ice-candidate')
    handleIceCandidate(client: Socket, payload: { conversationId: string; candidate: any; toUserId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`Sending ICE candidate to room ${roomName}`);
        client.to(roomName).emit('ice-candidate', payload);
    }

    @SubscribeMessage('call-user')
    handleCallUser(client: Socket, payload: { conversationId: string; toUserId: string; fromUserId: string; isVideo: boolean }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`User ${payload.fromUserId} calling ${payload.toUserId} in ${roomName}`);

        // Debug: Log room members
        const room = this.server.sockets.adapter.rooms.get(roomName);
        console.log(`Members in room ${roomName}:`, room ? Array.from(room) : 'Empty');

        // DEBUG: Broadcast to EVERYONE to rule out room issues
        console.log("Broadcasting call-made to ALL sockets");
        this.server.emit('call-made', payload);

        // Original: client.to(roomName).emit('call-made', payload);
        console.log("Call made");
    }

    @SubscribeMessage('call-accepted')
    handleCallAccepted(client: Socket, payload: { conversationId: string; toUserId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`Call accepted in ${roomName}`);
        client.to(roomName).emit('call-accepted', payload);
    }

    @SubscribeMessage('call-rejected')
    handleCallRejected(client: Socket, payload: { conversationId: string; toUserId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`Call rejected in ${roomName}`);
        client.to(roomName).emit('call-rejected', payload);
    }

    @SubscribeMessage('hang-up')
    handleHangUp(client: Socket, payload: { conversationId: string }) {
        const roomName = `conversation_${payload.conversationId}`;
        console.log(`Hang up in ${roomName}`);
        client.to(roomName).emit('hang-up', payload);
    }
}
