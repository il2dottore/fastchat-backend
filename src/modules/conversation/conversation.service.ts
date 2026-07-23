import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  Conversation,
  ConversationType,
  DirectConversationMetadata,
  GroupConversationMetadata,
} from './schemas/conversation.schema';
import { MongoEntityManager } from 'typeorm';
import { CreateConversationDto } from './dtos/create-conversation.dto';
import { plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { ParticipantService } from '../participant/participant.service';
import { JoinConversationDto } from './dtos/join-conversation.dto';
import {
  Participant,
  ParticipantRole,
} from '../participant/schemas/participant.schema';
import { Message } from '../message/schemas/message.schema';
import { User } from '../user/schemas/user.schema';
import { BlockUserDto } from '../chat-logic/dtos/block-user.dto';
import { BlockedUser } from '../chat-logic/schemas/blocked-user.schema';
import { UploadService } from '../upload/upload.service';
import { MessageSocketGateway } from '../message/message.gateway';

export interface InviteUserPayload {
  inviter: string;
  invitedEmail: string;
}

export const getMessagesFromConversationPipeline = (
  conversationObjectId: ObjectId,
) => [
  {
    $match: {
      conversationId: conversationObjectId,
    },
  },
  {
    $sort: {
      createdAt: 1, // oldest -> newest
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
  { $unwind: { path: '$senderParticipant', preserveNullAndEmptyArrays: true } },
  { $addFields: { senderRole: '$senderParticipant.role' } },
  {
    $project: {
      senderParticipant: 0,
      conversationId: 0,
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
  // Lookup forwarded message if exists
  {
    $lookup: {
      from: 'messages',
      let: { fid: '$metadata.forwardedMessageId' },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$_id', '$$fid'],
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
            createdAt: 1,
            sender: {
              _id: 1,
              fullname: 1,
              avatarUrl: 1,
            },
          },
        },
      ],
      as: 'metadata.forwardedMessage',
    },
  },
  {
    $unwind: {
      path: '$metadata.parentMessage',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $unwind: {
      path: '$metadata.forwardedMessage',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'reactions',
      let: { mid: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$messageId', '$$mid'],
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            messageId: 1,
            userId: 1,
            type: 1,
            createdAt: 1,
            user: {
              _id: 1,
              fullname: 1,
              avatarUrl: 1,
            },
          },
        },
      ],
      as: 'reactions',
    },
  },
  {
    $project: {
      'metadata.parentId': 0,
      'metadata.forwardedMessageId': 0,
    },
  },
];

@Injectable()
export class ConversationService {
  constructor(
    private readonly participantService: ParticipantService,
    private readonly entityManager: MongoEntityManager,
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => MessageSocketGateway))
    private readonly messageSocketGateway: MessageSocketGateway,
  ) {}

  async createConversation(createConversationDto: CreateConversationDto) {
    const data = plainToInstance(Conversation, createConversationDto, {
      excludeExtraneousValues: true,
    });

    switch (createConversationDto.type as ConversationType) {
      // --------------------------------------------
      // Validate create direct conversation request
      // --------------------------------------------
      case ConversationType.DIRECT: {
        // Check if 2 users already have direct conversation or not
        const canCreateDirectConversation =
          await this.participantService.canCreateDirectConversation(
            new ObjectId(createConversationDto.owners[0]),
            new ObjectId(createConversationDto.owners[1]),
          );
        if (null !== canCreateDirectConversation) {
          console.log(
            createConversationDto.owners[0],
            createConversationDto.owners[1],
            canCreateDirectConversation,
          );
          return canCreateDirectConversation;
        }
        data.metadata = plainToInstance(
          DirectConversationMetadata,
          createConversationDto.metadata,
        );
        break;
      }

      // --------------------------------------------
      // Validate create group conversation request
      // --------------------------------------------
      case ConversationType.GROUP:
        data.metadata = plainToInstance(
          GroupConversationMetadata,
          createConversationDto.metadata,
        );
        break;
      default:
        data.metadata = createConversationDto.metadata;
    }

    const conversation = await this.entityManager.save(data);

    // Add users in the request as owners of the conversation
    for (const ownerId of createConversationDto.owners) {
      await this.participantService.createParticipant(
        conversation._id,
        new ObjectId(ownerId),
        ParticipantRole.OWNER,
      );
    }

    return conversation;
  }

  /**
   * Get conversation information, count participants and more logics
   * @param conversationId
   */
  async getConversation(user: User, conversationId: ObjectId) {
    const pipeline = [
      {
        $match: {
          _id: conversationId,
        },
      },

      // Count participants
      {
        $lookup: {
          from: 'participants',
          let: { cid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$conversationId', '$$cid'] },
              },
            },
            { $count: 'count' },
          ],
          as: 'participants',
        },
      },
      {
        $addFields: {
          participantCount: {
            $ifNull: [{ $arrayElemAt: ['$participants.count', 0] }, 0],
          },
        },
      },
      { $project: { participants: 0 } },

      // --- NEW: Lookup partner for direct conversations ---
      {
        $lookup: {
          from: 'participants',
          let: { cid: '$_id', type: '$type', currentUser: user._id },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$cid'] },
                    { $ne: ['$userId', '$$currentUser'] },
                    { $eq: ['$$type', 'direct'] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
              },
            },
            {
              $unwind: '$user',
            },
          ],
          as: 'partner',
        },
      },

      // Optionally remove array (chỉ 1 user)
      {
        $addFields: {
          partner: { $arrayElemAt: ['$partner', 0] },
        },
      },
    ];

    const result = this.entityManager.aggregate(Conversation, pipeline);
    return result.toArray();
  }

  async getParticipants(conversationId: ObjectId) {
    const pipeline = [
      {
        $match: {
          conversationId: conversationId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: 0,
          'user.password': 0,
        },
      },
    ];
    const participants = this.entityManager.aggregate<
      Participant,
      Record<string, unknown>
    >(Participant, pipeline);
    return await participants.toArray();
  }

  async joinConversation(
    conversationId: ObjectId,
    joinConversationDto: JoinConversationDto,
  ) {
    const participantObjectId = new ObjectId(joinConversationDto.userId);

    // Check if conversation exists because MongoDB doesn't check the "foreign key"
    const conversation = await this.entityManager.findOne(Conversation, {
      where: {
        _id: conversationId,
      },
    });
    if (null === conversation)
      throw new Error(
        `Does not exist conversation ${conversationId.toString()}`,
      );

    const checkParticipant =
      await this.participantService.conversationHasParticipant(
        conversationId,
        participantObjectId,
      );
    if (null !== checkParticipant) {
      throw new Error('This user has already joined this conversation');
    }

    return await this.participantService.createParticipant(
      conversationId,
      participantObjectId,
      ParticipantRole.MEMBER,
    );
  }

  async getMessages(conversationObjectId: ObjectId) {
    const pipeline = getMessagesFromConversationPipeline(conversationObjectId);
    const messages = this.entityManager.aggregate<
      Message,
      Record<string, unknown>
    >(Message, pipeline);
    return await messages.toArray();
  }

  async inviteUserToConversation(
    conversationId: ObjectId,
    invitationPayload: InviteUserPayload,
  ) {
    const inviterObjectId = new ObjectId(invitationPayload.inviter);
    const invitedEmail = invitationPayload.invitedEmail;
    const conversationObjectId = new ObjectId(conversationId);

    const inviterInGroup =
      await this.participantService.conversationHasParticipant(
        conversationObjectId,
        inviterObjectId,
      );
    if (!inviterInGroup) {
      throw new Error('Inviter must be in conversation');
    }

    const invitedUser = await this.entityManager.findOne(User, {
      where: {
        email: invitedEmail,
      },
    });
    if (null === invitedUser) {
      throw new Error('Invited user not found');
    }

    const invitedInGroup =
      await this.participantService.conversationHasParticipant(
        conversationObjectId,
        new ObjectId(invitedUser._id),
      );
    if (invitedInGroup) {
      throw new Error(
        'Can not invite this user. Reason: User have already been in group',
      );
    }

    return await this.participantService.createParticipant(
      conversationObjectId,
      new ObjectId(invitedUser._id),
      ParticipantRole.MEMBER,
    );
  }

  async deleteConversation(userId: ObjectId, conversationId: ObjectId) {
    const user = await this.participantService.conversationHasParticipant(
      conversationId,
      userId,
    );
    if (null === user) {
      throw new Error('User is not in conversation');
    }
    if (user.role !== ParticipantRole.OWNER) {
      throw new Error(
        'User does not have permission to delete this conversation',
      );
    }

    // 1. Get all messages to delete attachments
    const messages = await this.entityManager.find(Message, {
      where: { conversationId: conversationId },
    });

    for (const message of messages) {
      if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          try {
            await this.uploadService.deleteFile(
              'attachments/' + attachment.fileName,
            );
          } catch (error) {
            console.error(
              `Failed to delete attachment ${attachment.fileName}:`,
              error,
            );
          }
        }
      }
    }

    // 2. Notify participants via socket BEFORE deleting them
    const participants = await this.entityManager.find(Participant, {
      where: { conversationId: conversationId },
    });

    const roomName = 'conversation_' + conversationId.toString();
    this.messageSocketGateway.server.to(roomName).emit('conversationDeleted', {
      conversationId: conversationId.toString(),
    });

    // 3. Delete everything from DB
    await this.entityManager.deleteMany(Message, {
      conversationId: conversationId,
    });
    await this.entityManager.deleteMany(Participant, {
      conversationId: conversationId,
    });
    await this.entityManager.deleteOne(Conversation, {
      _id: conversationId,
    });

    return participants;
  }

  async checkBlockPair(blockUserDto: BlockUserDto) {
    // Block 2 chiều
    const blockedUserPipeline = [
      {
        $match: {
          $or: [
            {
              blockerUserId: new ObjectId(blockUserDto.blockerUserId),
              blockedUserId: new ObjectId(blockUserDto.blockedUserId),
            },
            {
              blockerUserId: new ObjectId(blockUserDto.blockedUserId),
              blockedUserId: new ObjectId(blockUserDto.blockerUserId),
            },
          ],
        },
      },
    ];
    const cursor = await this.entityManager
      .aggregate<BlockedUser, BlockedUser>(BlockedUser, blockedUserPipeline)
      .toArray();
    const result = cursor.pop();
    return result ?? null;
  }

  async blockUser(blockUserDto: BlockUserDto) {
    const alreadyBlockPair = await this.checkBlockPair(blockUserDto);
    if (null !== alreadyBlockPair) {
      throw new Error(
        'Already had this block pair ' + alreadyBlockPair._id.toString(),
      );
    }
    await this.entityManager.save(BlockedUser, {
      blockerUserId: new ObjectId(blockUserDto.blockerUserId),
      blockedUserId: new ObjectId(blockUserDto.blockedUserId),
    });
  }

  async updateConversation(
    conversationId: string,
    updateConversationData: Record<string, unknown>,
  ) {
    await this.entityManager.updateOne(
      Conversation,
      {
        _id: new ObjectId(conversationId),
      },
      {
        $set: updateConversationData,
      },
    );
  }

  async leaveConversation(userId: ObjectId, conversationId: ObjectId) {
    await this.participantService.deleteParticipant(conversationId, userId);
  }
}
