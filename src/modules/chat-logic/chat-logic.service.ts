import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { BlockUserDto } from './dtos/block-user.dto';
import { MongoEntityManager } from 'typeorm';
import { BlockedUser } from './schemas/blocked-user.schema';

interface BlockedListEntry {
  _id: ObjectId;
  createdAt: Date;
  blockedUser: Record<string, unknown>;
}

@Injectable()
export class ChatLogicService {
  constructor(private readonly entityManager: MongoEntityManager) {}
  async checkBlockPair(blockUserDto: BlockUserDto) {
    const blockedUserPipeline = [
      {
        $match: {
          $or: [
            {
              blockerUserId: new ObjectId(blockUserDto.blockerUserId),
              blockedUserId: new ObjectId(blockUserDto.blockedUserId),
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

  async deleteBlockPair(blockUserDto: BlockUserDto) {
    const alreadyBlockPair = await this.checkBlockPair(blockUserDto);
    if (null === alreadyBlockPair) {
      throw new Error('Not blocked');
    }
    await this.entityManager.deleteOne(BlockedUser, {
      blockerUserId: new ObjectId(blockUserDto.blockerUserId),
      blockedUserId: new ObjectId(blockUserDto.blockedUserId),
    });
  }

  async getBlockedList(userId: string) {
    const pipeline = [
      {
        $match: {
          blockerUserId: new ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'blockedUserId',
          foreignField: '_id',
          as: 'blockedUser',
          pipeline: [
            {
              $project: {
                password: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: '$blockedUser',
      },
      {
        $project: {
          password: 0,
          blockerUserId: 0,
          blockedUserId: 0,
        },
      },
    ];
    const blockList = await this.entityManager
      .aggregate<BlockedUser, BlockedListEntry>(BlockedUser, pipeline)
      .toArray();
    return blockList;
  }
}
