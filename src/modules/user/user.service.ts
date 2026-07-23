import { Injectable } from '@nestjs/common';
import { FilterOperators, FindManyOptions, MongoEntityManager } from 'typeorm';
import { User } from './schemas/user.schema';
import { CreateUserDto } from '../conversation/dtos/create-user.dto';
import { plainToInstance } from 'class-transformer';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { Participant } from '../participant/schemas/participant.schema';

@Injectable()
export class UserService {
  constructor(private readonly entityManager: MongoEntityManager) {}

  async find(
    optionsOrConditions?:
      FindManyOptions<User> | Partial<User> | FilterOperators<User>,
  ) {
    return await this.entityManager.find(User, optionsOrConditions);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const emailExists = await this.entityManager.findOne(User, {
      where: {
        email: createUserDto.email,
      },
    });
    if (emailExists) {
      throw new Error('This email is already in used');
    }

    if (createUserDto.username) {
      const usernameExists = await this.entityManager.findOne(User, {
        where: {
          username: createUserDto.username,
        },
      });
      if (usernameExists) {
        throw new Error('This username is already in used');
      }
    }

    createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    const data = plainToInstance(User, createUserDto);
    data.isVerified = false;
    const user = await this.entityManager.save(data);
    return user;
  }

  async checkAvailability(email: string, username: string) {
    const emailExists = await this.entityManager.findOne(User, {
      where: { email },
    });
    const usernameExists = await this.entityManager.findOne(User, {
      where: { username },
    });
    return {
      emailAvailable: !emailExists,
      usernameAvailable: !usernameExists,
    };
  }

  async verifyUser(email: string) {
    const user = await this.entityManager.findOne(User, { where: { email } });
    if (!user) throw new Error('User not found');
    user.isVerified = true;
    await this.entityManager.save(user);
  }

  async getConversationsByUser(userId: ObjectId) {
    const userObjectId = new ObjectId(userId);
    const pipeline = [
      {
        $match: {
          userId: userObjectId,
        },
      },
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversation',
        },
      },
      {
        $unwind: '$conversation',
      },
      {
        $replaceRoot: {
          newRoot: '$conversation',
        },
      },
      {
        $lookup: {
          from: 'participants',
          let: { convId: '$_id', type: '$type' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $ne: ['$userId', userObjectId] },
                  ],
                },
              },
            },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userInfo',
              },
            },
            { $unwind: '$userInfo' },
            {
              $project: {
                _id: '$userInfo._id',
                fullname: '$userInfo.fullname',
                username: '$userInfo.username',
                avatarUrl: '$userInfo.avatarUrl',
                userStatus: '$userInfo.userStatus',
                lastOnline: '$userInfo.lastOnline',
              },
            },
          ],
          as: 'partnerData',
        },
      },

      {
        $addFields: {
          partner: {
            $cond: {
              if: { $eq: ['$type', 'direct'] },
              then: { $arrayElemAt: ['$partnerData', 0] },
              else: '$$REMOVE',
            },
          },
        },
      },
      {
        $project: {
          partnerData: 0,
        },
      },
    ];
    const cursor = this.entityManager.aggregate(Participant, pipeline);
    return await cursor.toArray();
  }

  async updateUserStatus(userId: ObjectId, status: string) {
    return await this.entityManager.update(User, userId, {
      userStatus: status as any,
      lastOnline: status === 'offline' ? new Date() : undefined,
    });
  }

  async updateFcmToken(userId: ObjectId, token: string | null) {
    return await this.entityManager.update(User, userId, {
      fcmToken: token,
    });
  }
}
