import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from './dtos/create-message.dto';
import { MessageService } from './message.service';
import { MongoEntityManager } from 'typeorm';
import { Message } from './schemas/message.schema';
import { ObjectId } from 'mongodb';
import { UserService } from '../user/user.service';
import { UserStatus, User } from '../user/schemas/user.schema';
import { NotificationService } from '../notification/notification.service';
import { Participant } from '../participant/schemas/participant.schema';
import { ReactionService } from '../reaction/reaction.service';
import { ReactionType } from '../reaction/schemas/reaction.schema';
import { ParticipantRole } from '../participant/schemas/participant.schema';

// Payload shapes for socket events.
interface ConversationRoomPayload {
  conversationId: string;
}

// Shape of a message document enriched by `socketMessagePipeline`.
interface AggregatedMessageSender {
  _id: ObjectId;
  fullname: string | null;
  avatarUrl?: string | null;
}

interface AggregatedMessage {
  _id: ObjectId;
  conversationId: ObjectId;
  sender: AggregatedMessageSender;
  senderRole?: ParticipantRole;
  metadata: {
    textContent?: string | null;
    parentMessage?: unknown;
  };
  attachments?: unknown[];
  isDeleted?: boolean;
  isModified?: boolean;
  createdAt: Date;
}

// Socket.IO server for messages processing.
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessageSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private socketIdToUserId = new Map<string, string>();

  socketMessagePipeline = (messageId: ObjectId) => {
    return [
      {
        $match: {
          _id: messageId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'sender',
        },
      },
      {
        $unwind: '$sender',
      },
      {
        $project: {
          userId: 0,
          'sender.password': 0,
          'sender.email': 0,
        },
      },
      {
        $lookup: {
          from: 'participants',
          let: { cid: '$conversationId', sid: '$senderId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$cid'] },
                    { $eq: ['$userId', '$$sid'] },
                  ],
                },
              },
            },
          ],
          as: 'senderParticipant',
        },
      },
      {
        $unwind: {
          path: '$senderParticipant',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $addFields: { senderRole: '$senderParticipant.role' } },
      {
        $project: {
          senderParticipant: 0,
          senderId: 0,
        },
      },

      // Lookup parent message if exists
      {
        $lookup: {
          from: 'messages',
          let: { pid: '$metadata.parentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$pid'],
                },
              },
            },
            // lookup sender của parent message
            {
              $lookup: {
                from: 'users',
                localField: 'senderId',
                foreignField: '_id',
                as: 'sender',
              },
            },
            { $unwind: '$sender' },

            {
              $project: {
                isDeleted: 1,
                'metadata.textContent': 1,
                createdAt: 1,
                sender: {
                  _id: 1,
                  fullname: 1,
                  avatarUrl: 1,
                },
              },
            },
          ],
          as: 'metadata.parentMessage',
        },
      },
      {
        $unwind: {
          path: '$metadata.parentMessage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          'metadata.parentId': 0,
        },
      },
    ];
  };
  constructor(
    private readonly entityManager: MongoEntityManager,
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly reactionService: ReactionService,
  ) {}
  @WebSocketServer()
  server: Server;

  handleConnection(@ConnectedSocket() client: Socket) {
    console.log('Client connected', client.id);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('Client disconnected', client.id);
    const userId = this.socketIdToUserId.get(client.id);
    if (userId) {
      await this.userService.updateUserStatus(
        new ObjectId(userId),
        UserStatus.OFFLINE,
      );
      this.socketIdToUserId.delete(client.id);
      this.server.emit('userStatusChanged', {
        userId: userId,
        status: UserStatus.OFFLINE,
        lastOnline: new Date(),
      });
    }
  }

  @SubscribeMessage('registerUser')
  async handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    console.log(`Registering user ${data.userId} for socket ${client.id}`);
    this.socketIdToUserId.set(client.id, data.userId);
    await this.userService.updateUserStatus(
      new ObjectId(data.userId),
      UserStatus.ONLINE,
    );
    this.server.emit('userStatusChanged', {
      userId: data.userId,
      status: UserStatus.ONLINE,
    });
  }

  @SubscribeMessage('accessConversation')
  async accessConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ConversationRoomPayload,
  ) {
    const conversationRoomName = 'conversation_' + data.conversationId;
    await client.join(conversationRoomName);
    console.log(client.rooms);
    console.log('Client joined ' + conversationRoomName);
  }

  @SubscribeMessage('quitConversation')
  async quitConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ConversationRoomPayload,
  ) {
    const conversationRoomName = 'conversation_' + data.conversationId;
    await client.leave(conversationRoomName);
    console.log('Client quit ' + conversationRoomName);
  }

  @SubscribeMessage('createMessage')
  async handleNewMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: CreateMessageDto,
  ) {
    console.log(message);
    const createdMessage = await this.messageService.createMessage(message);
    const pipeline = this.socketMessagePipeline(createdMessage._id);
    const result = (await this.entityManager
      .aggregate(Message, pipeline)
      .toArray()) as AggregatedMessage[];
    const messageCreatedSocketResponse = result[0];
    console.log(messageCreatedSocketResponse);
    const targetConversationRoom =
      'conversation_' + messageCreatedSocketResponse.conversationId.toString();
    console.log(targetConversationRoom);
    this.server
      .to(targetConversationRoom)
      .emit('messageCreated', messageCreatedSocketResponse);

    const lastMessageUpdatedResponse = {
      _id: messageCreatedSocketResponse._id,
      conversationId: messageCreatedSocketResponse.conversationId,
      metadata: {
        textContent: messageCreatedSocketResponse.metadata.textContent,
      },
      createdAt: messageCreatedSocketResponse.createdAt,
      sender: {
        _id: messageCreatedSocketResponse.sender._id,
        fullname: messageCreatedSocketResponse.sender.fullname,
      },
    };
    console.log(
      'lastMessageUpdatedResponse: ' +
        JSON.stringify(lastMessageUpdatedResponse),
    );
    this.server.emit('lastMessageUpdated', lastMessageUpdatedResponse);

    // Send push notifications
    void this.sendPushNotifications(messageCreatedSocketResponse);
  }

  private async sendPushNotifications(message: AggregatedMessage) {
    try {
      const conversationId = new ObjectId(message.conversationId);
      const senderId = new ObjectId(message.sender._id);

      // Find all participants in the conversation
      const participants = await this.entityManager.find(Participant, {
        where: { conversationId: conversationId },
      });

      const userIds = participants
        .map((p) => p.userId)
        .filter((id) => !id.equals(senderId));

      if (userIds.length === 0) return;

      // Find FCM tokens for these users
      const users = await this.entityManager.find(User, {
        where: {
          _id: { $in: userIds },
        },
      });

      const tokens = users
        .map((u) => u.fcmToken)
        .filter((t) => t != null && t !== '') as string[];

      if (tokens.length === 0) return;

      const title = message.sender.fullname || 'New Message';
      const body = message.metadata.textContent || 'Sent an attachment';

      await this.notificationService.sendToMultipleDevices(
        tokens,
        title,
        body,
        {
          conversationId: message.conversationId.toString(),
          type: 'new_message',
        },
      );
    } catch (error) {
      console.error('Error in sendPushNotifications:', error);
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleMessageDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      messageId: string;
    },
  ) {
    const userId = this.socketIdToUserId.get(client.id);
    if (!userId) return;

    const messageId = new ObjectId(body.messageId);
    const message = await this.entityManager.findOne(Message, {
      where: { _id: messageId },
    });
    if (!message) return;

    const myParticipant = await this.entityManager.findOne(Participant, {
      where: {
        conversationId: message.conversationId,
        userId: new ObjectId(userId),
      },
    });
    if (!myParticipant) return;

    const senderParticipant = await this.entityManager.findOne(Participant, {
      where: {
        conversationId: message.conversationId,
        userId: message.senderId,
      },
    });

    let canDelete = message.senderId.toString() === userId;
    if (!canDelete && senderParticipant) {
      if (myParticipant.role === ParticipantRole.OWNER) {
        if (
          senderParticipant.role === ParticipantRole.MEMBER ||
          senderParticipant.role === ParticipantRole.ADMINISTRATOR
        ) {
          canDelete = true;
        }
      } else if (myParticipant.role === ParticipantRole.ADMINISTRATOR) {
        if (senderParticipant.role === ParticipantRole.MEMBER) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) return;

    const deletedMessage = await this.messageService.deleteMessage(messageId);
    const pipeline = this.socketMessagePipeline(deletedMessage);
    const result = (await this.entityManager
      .aggregate(Message, pipeline)
      .toArray()) as AggregatedMessage[];
    const socketResponse = result[0];
    const targetConversationRoom =
      'conversation_' + socketResponse.conversationId.toString();
    console.log(socketResponse);
    this.server
      .to(targetConversationRoom)
      .emit('messageDeleted', socketResponse);
  }

  @SubscribeMessage('updateMessage')
  async handleMessageUpdated(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      messageId: string;
      textContent: string;
    },
  ) {
    const updatedMessage = await this.messageService.updateMessage(
      new ObjectId(body.messageId),
      body.textContent,
    );
    const pipeline = this.socketMessagePipeline(updatedMessage);
    const result = (await this.entityManager
      .aggregate(Message, pipeline)
      .toArray()) as AggregatedMessage[];
    const socketResponse = result[0];
    const targetConversationRoom =
      'conversation_' + socketResponse.conversationId.toString();
    console.log(socketResponse);
    this.server
      .to(targetConversationRoom)
      .emit('messageUpdated', socketResponse);
  }

  @SubscribeMessage('addReaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      messageId: string;
      type: ReactionType;
    },
  ) {
    console.log(`[Gateway] addReaction called. Body:`, body);
    try {
      const userId = this.socketIdToUserId.get(client.id);
      console.log(
        `[Gateway] addReaction client.id: ${client.id}, userId from map: ${userId}`,
      );
      if (!userId) {
        console.warn(
          `[Gateway] addReaction ignored: User not identified for socket ${client.id}`,
        );
        return;
      }

      const messageId = new ObjectId(body.messageId);
      await this.reactionService.addReaction(
        new ObjectId(userId),
        messageId,
        body.type,
      );

      const reactions =
        await this.reactionService.getReactionsByMessage(messageId);
      const message = await this.entityManager.findOne(Message, {
        where: { _id: messageId },
      });
      if (!message) return;

      const targetConversationRoom =
        'conversation_' + message.conversationId.toString();
      this.server.to(targetConversationRoom).emit('messageReactionUpdated', {
        messageId: body.messageId,
        reactions: reactions,
      });
    } catch (e) {
      console.error(e);
    }
  }

  @SubscribeMessage('removeReaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      messageId: string;
    },
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      if (!userId) return;

      const messageId = new ObjectId(body.messageId);
      await this.reactionService.removeReaction(
        new ObjectId(userId),
        messageId,
      );

      const reactions =
        await this.reactionService.getReactionsByMessage(messageId);
      const message = await this.entityManager.findOne(Message, {
        where: { _id: messageId },
      });
      if (!message) return;

      const targetConversationRoom =
        'conversation_' + message.conversationId.toString();
      this.server.to(targetConversationRoom).emit('messageReactionUpdated', {
        messageId: body.messageId,
        reactions: reactions,
      });
    } catch (e) {
      console.error(e);
    }
  }

  // ================= CALL GATEWAY LOGIC MERGED =================

  @SubscribeMessage('joinCall')
  handleJoinCall(
    client: Socket,
    payload: { conversationId: string; userId: string },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    void client.join(roomName);
    console.log(`[Merged] User ${payload.userId} joined call room ${roomName}`);
    client.emit('joinedCall', { conversationId: payload.conversationId });
  }

  @SubscribeMessage('offer')
  handleOffer(
    client: Socket,
    payload: { conversationId: string; offer: any; toUserId: string },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    console.log(`[Merged] Sending offer to room ${roomName}`);
    client.to(roomName).emit('offer', payload);
  }

  @SubscribeMessage('answer')
  handleAnswer(
    client: Socket,
    payload: { conversationId: string; answer: any; toUserId: string },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    console.log(`[Merged] Sending answer to room ${roomName}`);
    client.to(roomName).emit('answer', payload);
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    client: Socket,
    payload: { conversationId: string; candidate: any; toUserId: string },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    console.log(`[Merged] Sending ICE candidate to room ${roomName}`);
    client.to(roomName).emit('ice-candidate', payload);
  }

  @SubscribeMessage('call-user')
  handleCallUser(
    client: Socket,
    payload: {
      conversationId: string;
      toUserId: string;
      fromUserId: string;
      isVideo: boolean;
    },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    client.to(roomName).emit('call-made', payload);
  }

  @SubscribeMessage('call-accepted')
  handleCallAccepted(
    client: Socket,
    payload: { conversationId: string; toUserId: string },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    console.log(`[Merged] Call accepted in ${roomName}`);
    client.to(roomName).emit('call-accepted', payload);
  }

  @SubscribeMessage('call-rejected')
  handleCallRejected(
    client: Socket,
    payload: { conversationId: string; toUserId: string },
  ) {
    const roomName = `conversation_${payload.conversationId}`;
    console.log(`[Merged] Call rejected in ${roomName}`);
    client.to(roomName).emit('call-rejected', payload);
  }

  @SubscribeMessage('hang-up')
  handleHangUp(client: Socket, payload: { conversationId: string }) {
    const roomName = `conversation_${payload.conversationId}`;
    console.log(`[Merged] Hang up in ${roomName}`);
    client.to(roomName).emit('hang-up', payload);
  }
}
