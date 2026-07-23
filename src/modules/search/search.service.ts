import { Injectable } from '@nestjs/common';
import { MongoEntityManager } from 'typeorm';
import { User } from '../user/schemas/user.schema';
import { ObjectId } from 'mongodb';
import { Message } from '../message/schemas/message.schema';
import { Conversation } from '../conversation/schemas/conversation.schema';

@Injectable()
export class SearchService {
  constructor(private readonly entityManager: MongoEntityManager) {}
  async searchUserByEmail(email: string) {
    return await this.entityManager.findOne(User, {
      where: {
        email: email,
      },
    });
  }

  async searchMessageByKeyword(conversationId: ObjectId, keyword: string) {
    const pipeline = [
      {
        $match: {
          conversationId: conversationId,
          'metadata.textContent': {
            $regex: keyword,
            $options: 'i',
          },
        },
      },
      {
        $project: {
          _id: 1,
          metadata: {
            textContent: 1,
          },
          senderId: 1,
          createdAt: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { senderId: '$senderId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$senderId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                fullname: 1,
                avatarUrl: 1,
              },
            },
          ],
          as: 'sender',
        },
      },
      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    return this.entityManager.aggregate(Message, pipeline).toArray();
  }

  async searchGlobal(keyword: string) {
    // Search users
    const users = await this.entityManager.find(User, {
      where: {
        $or: [
          { username: { $regex: keyword, $options: 'i' } },
          { fullname: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
        ],
      } as any,
      take: 10,
    });

    // Search public groups
    const groupsPipeline = [
      {
        $match: {
          type: 'group',
          $or: [
            { 'metadata.groupName': { $regex: keyword, $options: 'i' } },
            { 'metadata.inviteSlug': { $regex: keyword, $options: 'i' } },
          ],
          'metadata.accessibility': 'public',
        },
      },
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
          as: 'participantCountLookup',
        },
      },
      {
        $addFields: {
          participantCount: {
            $ifNull: [
              { $arrayElemAt: ['$participantCountLookup.count', 0] },
              0,
            ],
          },
        },
      },
      { $project: { participantCountLookup: 0 } },
      { $limit: 10 },
    ];

    const groups = await this.entityManager
      .aggregate(Conversation, groupsPipeline)
      .toArray();

    return {
      users: users.map((u) => {
        const { password, ...rest } = u;
        return rest;
      }),
      groups,
    };
  }
}
