import { Injectable } from '@nestjs/common';
import { Participant, ParticipantRole } from './schemas/participant.schema';
import {
  Conversation,
  ConversationType,
} from '../conversation/schemas/conversation.schema';
import { ObjectId } from 'mongodb';
import { MongoEntityManager } from 'typeorm';
import { UserService } from '../user/user.service';
import { SetRoleDto } from './dto/set-role.dto';
import { KickParticipantDto } from './dto/kick-paricipant.dto';
import { BanParticipantDto } from './dto/ban-participant.dto';

@Injectable()
export class ParticipantService {
  constructor(
    private readonly entityManager: MongoEntityManager,
    private readonly userService: UserService,
  ) {}
  async createParticipant(
    conversationId: ObjectId,
    userId: ObjectId,
    role: ParticipantRole,
  ) {
    const participant = new Participant();
    participant.conversationId = conversationId;
    participant.userId = userId;
    participant.role = role;
    participant.banStatus = {
      isBanned: false,
    };
    return await this.entityManager.save(Participant, participant);
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
    const participants = this.entityManager.aggregate(Participant, pipeline);
    return await participants.toArray();
  }

  async conversationHasParticipant(
    conversationId: ObjectId,
    participantId: ObjectId,
  ): Promise<Participant | null> {
    const participant = await this.entityManager.findOne(Participant, {
      where: {
        conversationId: conversationId,
        userId: participantId,
      },
    });
    return participant;
  }

  async canCreateDirectConversation(
    firstUserId: ObjectId,
    secondUserId: ObjectId,
  ) {
    if (
      null === (await this.userService.find({ where: { _id: firstUserId } })) ||
      null === (await this.userService.find({ where: { _id: secondUserId } }))
    )
      throw new Error('Input users are not valid');
    const pipeline = [
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversation',
        },
      },
      { $unwind: '$conversation' },
      // ❗ lọc DIRECT ở đây
      {
        $match: {
          'conversation.type': 'direct',
        },
      },
      // sau khi chỉ còn DIRECT → mới lọc participants
      {
        $match: {
          userId: { $in: [firstUserId, secondUserId] },
        },
      },
      {
        $group: {
          _id: '$conversationId',
          participants: { $addToSet: '$userId' },
        },
      },

      {
        $match: {
          participants: { $all: [firstUserId, secondUserId], $size: 2 },
        },
      },
    ];

    const cursor = this.entityManager.aggregate(Participant, pipeline);
    const directConversation = await cursor.toArray();
    return directConversation.length > 0 ? directConversation[0] : null;
  }

  async getParticipant(
    userId: ObjectId | string,
    conversationId: ObjectId | string,
  ) {
    return await this.entityManager.findOne(Participant, {
      where: {
        userId: new ObjectId(userId),
        conversationId: new ObjectId(conversationId),
      },
    });
  }

  async setRole(setRoleDto: SetRoleDto) {
    const allowedRole = ['owner', 'administrator', 'member'];
    if (!allowedRole.includes(setRoleDto.participantRole)) {
      throw new Error('Invalid role, must be ' + allowedRole);
    }
    const participantSetter = await this.getParticipant(
      setRoleDto.setterUserId,
      setRoleDto.conversationId,
    );
    if (null === participantSetter) {
      throw new Error('Not found participant');
    }
    if (participantSetter.role !== ParticipantRole.OWNER) {
      throw new Error('Missing permission');
    }
    if (setRoleDto.participantRole === 'owner') {
      throw new Error('Can not set owner');
    }
    await this.entityManager.updateOne(
      Participant,
      {
        userId: new ObjectId(setRoleDto.memberUserId),
        conversationId: new ObjectId(setRoleDto.conversationId),
      },
      {
        $set: {
          role: setRoleDto.participantRole,
        },
      },
    );
  }

  async kickParticipant(kickParticipantDto: KickParticipantDto) {
    await this.entityManager.deleteOne(Participant, {
      conversationId: new ObjectId(kickParticipantDto.conversationId),
      userId: new ObjectId(kickParticipantDto.kickedUserId),
    });
  }

  async banParticipant(banParticipantDto: BanParticipantDto) {
    // User got banned
    const bannedParticipant = await this.getParticipant(
      banParticipantDto.bannedUser,
      banParticipantDto.conversationId,
    );
    if (null === bannedParticipant) {
      throw new Error('Banned participant not found');
    }
    // User banned user got banned
    const userBaner = await this.getParticipant(
      banParticipantDto.bannedBy,
      banParticipantDto.conversationId,
    );
    if (null === userBaner) {
      throw new Error('Ban owner participant not found');
    }
    if (bannedParticipant.role === ParticipantRole.OWNER) {
      throw new Error('Không thể ban chủ group');
    }
    if (
      userBaner.role !== ParticipantRole.ADMINISTRATOR &&
      userBaner.role !== ParticipantRole.OWNER
    ) {
      throw new Error('Bạn không có quyền Administrator/Owner để ban');
    }
    if (
      userBaner.role === ParticipantRole.ADMINISTRATOR &&
      userBaner.role === ParticipantRole.ADMINISTRATOR
    ) {
      throw new Error('ADMINISTRATOR không thể cấm người cùng cấp bậc');
    }
    // Ban thật nè
    const banDuration = Date.now() + banParticipantDto.banDuration * 1000;
    await this.entityManager.updateOne(
      Participant,
      {
        userId: new ObjectId(bannedParticipant.userId),
        conversationId: new ObjectId(bannedParticipant.conversationId),
      },
      {
        $set: {
          'banStatus.isBanned': true,
          'banStatus.bannedBy': new ObjectId(userBaner.userId),
          'banStatus.releaseDate': new Date(banDuration),
          'banStatus.reason': banParticipantDto.reason,
        },
      },
    );
  }

  async removeBanFromParticipant(conversationId: string, bannedUser: string) {
    const bannedParticipant = await this.getParticipant(
      new ObjectId(bannedUser),
      new ObjectId(conversationId),
    );
    console.log(bannedParticipant);
    if (null === bannedParticipant) {
      throw new Error('Banned participant not found');
    }
    if (!bannedParticipant.banStatus.isBanned) {
      throw new Error('User is not banned');
    }
    await this.entityManager.updateOne(
      Participant,
      {
        userId: new ObjectId(bannedParticipant.userId),
        conversationId: new ObjectId(bannedParticipant.conversationId),
      },
      {
        $set: {
          banStatus: {
            isBanned: false,
          },
        },
      },
    );
  }

  async deleteParticipant(conversationId: ObjectId, userId: ObjectId) {
    await this.entityManager.deleteOne(Participant, {
      conversationId: conversationId,
      userId: userId,
    });
  }

  async leaveConversation(userId: ObjectId, conversationId: ObjectId) {
    // Check conversation exists and is group
    const conversation = await this.entityManager.findOne(Conversation, {
      where: { _id: conversationId },
    });
    if (!conversation) throw new Error('Conversation not found');
    if (conversation.type !== ConversationType.GROUP) {
      throw new Error('Only group conversations can be left');
    }

    // Check if participant exists
    const participant = await this.getParticipant(userId, conversationId);
    if (!participant)
      throw new Error('You are not a participant of this conversation');

    // Delete participant
    await this.entityManager.deleteOne(Participant, {
      _id: participant._id,
    });

    return true;
  }

  async joinConversation(userId: ObjectId, conversationId: ObjectId) {
    // Check conversation exists and is group
    const conversation = await this.entityManager.findOne(Conversation, {
      where: { _id: conversationId },
    });
    if (!conversation) throw new Error('Conversation not found');
    if (conversation.type !== ConversationType.GROUP) {
      throw new Error('Only group conversations can be joined');
    }

    // Check accessibility
    const metadata = conversation.metadata as any;
    if (metadata.accessibility !== 'public') {
      throw new Error('This group is private');
    }

    // Check if participant exists
    const participant = await this.getParticipant(userId, conversationId);
    if (participant)
      throw new Error('You are already a participant of this conversation');

    // Create participant
    await this.createParticipant(
      conversationId,
      userId,
      ParticipantRole.MEMBER,
    );

    return true;
  }
}
