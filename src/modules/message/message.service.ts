import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dtos/create-message.dto';
import { MongoEntityManager } from 'typeorm';
import { ObjectId } from 'mongodb';
import { UserService } from '../user/user.service';
import { Message, MessageMetadata } from './schemas/message.schema';
import { plainToInstance } from 'class-transformer';
import { ParticipantService } from '../participant/participant.service';
import { Conversation } from '../conversation/schemas/conversation.schema';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly entityManager: MongoEntityManager,
    private readonly userService: UserService,
    private readonly participantService: ParticipantService,
    private readonly uploadService: UploadService,
  ) {}
  async createMessage(createMessageDto: CreateMessageDto) {
    // Check conversation exists or not
    const conversationObjectId = new ObjectId(createMessageDto.conversationId);
    const conversation = await this.entityManager.findOne(Conversation, {
      where: {
        _id: conversationObjectId,
      },
    });
    if (null === conversation)
      throw new Error('This conversation does not exist');
    // Check sender exists or not
    const senderObjectId = new ObjectId(createMessageDto.senderId);
    const user = await this.userService.find({
      where: { _id: senderObjectId },
    });
    if (null === user) throw new Error('This user does not exist');
    // Check if user already joined the conversation or not
    const conversationHasUser =
      await this.participantService.conversationHasParticipant(
        conversationObjectId,
        senderObjectId,
      );
    if (null === conversationHasUser)
      throw new Error('User is not in this conversation');

    const metadata = plainToInstance(
      MessageMetadata,
      createMessageDto.metadata,
    );

    const message = new Message();
    message.conversationId = conversationObjectId;
    message.senderId = senderObjectId;
    message.isModified = false;
    // If this message is not a reply.
    if (!metadata.parentId) {
      metadata.parentId = null;
    } else {
      // Reply message always has text content
      if (!metadata.textContent)
        throw new Error(
          'createMessage error: Reply message must have text content',
        );
      const parentMessageObjectId = await this.canCreateReplyMessage(
        new ObjectId(message.conversationId),
        new ObjectId(metadata.parentId),
      );
      // Finally, assign ObjectId(parentId) to metadata
      metadata.parentId = parentMessageObjectId;
    }
    if (!metadata.forwardedMessageId) {
      metadata.forwardedMessageId = null;
    } else {
      metadata.forwardedMessageId = new ObjectId(metadata.forwardedMessageId);
    }
    message.metadata = metadata;
    if (
      !createMessageDto.attachments ||
      0 === createMessageDto.attachments.length
    ) {
      message.attachments = [];
    } else {
      message.attachments = createMessageDto.attachments;
    }
    console.log(message);
    return await this.entityManager.save(message);
  }

  /**
   * Check if `parentMessageObjectId` and `conversationObjectId` is valid or not for sending
   * reply message
   * @param targetConversationObjectId
   * @param parentMessageObjectId
   */
  async canCreateReplyMessage(
    targetConversationObjectId: ObjectId,
    parentMessageObjectId: ObjectId,
  ) {
    // Check if parent message exists
    const foundParentMessage = await this.entityManager.findOne(Message, {
      where: {
        _id: new ObjectId(parentMessageObjectId),
      },
    });
    if (null === foundParentMessage) {
      throw new Error(
        'canCreateReplyMessage error: Not found parent message with ID: ' +
          parentMessageObjectId,
      );
    }

    // Check if parent message's conversation and
    // target conversation is in the same conversation or not
    if (
      foundParentMessage.conversationId.toString() !==
      targetConversationObjectId.toString()
    )
      throw new Error(
        'canCreateReplyMessage error: The target conversation does not have any message with ID ' +
          parentMessageObjectId,
      );

    return new ObjectId(parentMessageObjectId);
  }

  /**
   * Docs
   * @param forwardedMessageObjectId
   * @param targetConversationObjectId
   */
  async canCreateForwardedMessage(
    forwardedMessageObjectId: ObjectId,
    targetConversationObjectId: ObjectId,
  ) {}

  async getLastMessageFromConversations(userId: ObjectId) {
    const pipeline = [
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'participants',
          localField: 'conversationId',
          foreignField: 'conversationId',
          as: 'participants',
        },
      },
      {
        $match: {
          'participants.userId': userId,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$lastMessage',
        },
      },
      {
        $sort: {
          createdAt: -1,
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
      { $unwind: '$sender' },
      {
        $project: {
          conversationId: 1,
          sender: {
            _id: 1,
            fullname: 1,
          },
          metadata: {
            textContent: 1,
          },
          createdAt: 1,
        },
      },
    ];

    const cursor = this.entityManager.aggregate(Message, pipeline);
    return await cursor.toArray();
  }

  async deleteMessage(messageId: ObjectId) {
    // Lấy dữ liệu tin nhắn cần xoá (Để xoá attachment trước)
    const deleteMessage = await this.entityManager.findOne(Message, {
      where: {
        _id: messageId,
      },
    });
    if (deleteMessage === null) {
      throw new Error('Not found');
    }
    // Phát hiện tin nhắn cần xoá có attachment
    if (deleteMessage.attachments.length > 0) {
      for (const attachment of deleteMessage.attachments) {
        await this.uploadService.deleteFile(attachment.fileName);
      }
    }
    // Xoá tin nhắn, soft delete
    await this.entityManager.updateOne(
      Message,
      {
        _id: messageId,
      },
      {
        $set: {
          isDeleted: true,
          metadata: {},
          attachments: [],
        },
      },
    );
    return messageId;
  }
  async updateMessage(messageId: ObjectId, textContent: string) {
    await this.entityManager.updateOne(
      Message,
      {
        _id: messageId,
      },
      {
        $set: {
          'metadata.textContent': textContent,
          isModified: true,
        },
      },
    );
    return messageId;
  }
}
