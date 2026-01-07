import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { MongoEntityManager } from 'typeorm';
import { Contact } from './schemas/contact.schema';
import { IsString } from 'class-validator';

export class AddContactDto {
  @IsString()
  ownerId: string;
  @IsString()
  peerId: string;
}

export class DeleteContactDto {
  @IsString()
  ownerId: string;
  @IsString()
  peerId: string;
}

@Injectable()
export class ContactService {
  constructor(
    private readonly entityManager: MongoEntityManager
  ) { }

  async create(addContactDto: AddContactDto) {
    const foundContact = await this.contactExists(
      new ObjectId(addContactDto.ownerId),
      new ObjectId(addContactDto.peerId),
    );
    if (foundContact) throw new Error('Contact already existed');
    return await this.entityManager.save(Contact, {
      ownerId: new ObjectId(addContactDto.ownerId),
      peerId: new ObjectId(addContactDto.peerId),
    });
  }

  async delete(deleteContactDto: DeleteContactDto) {
    const foundContact = await this.contactExists(
      new ObjectId(deleteContactDto.ownerId),
      new ObjectId(deleteContactDto.peerId),
    );
    if (!foundContact) throw new Error('Contact does not exist');
    return await this.entityManager.deleteOne(Contact, {
      ownerId: new ObjectId(deleteContactDto.ownerId),
      peerId: new ObjectId(deleteContactDto.peerId),
    });
  }

  async getContacts(ownerId: ObjectId) {
    const pipeline = [
      {
        $match: {
          ownerId: ownerId,
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "peerId",
          foreignField: "_id",
          as: "peerUser",
        },
      },
      {
        $unwind: "$peerUser",
      },
    ];
    const result = this.entityManager.aggregate(Contact, pipeline);
    return result.toArray();
  }

  async contactExists(ownerId: ObjectId, peerId: ObjectId) {
    return await this.entityManager.findOne(
      Contact,
      {
        where: {
          ownerId: ownerId,
          peerId: peerId
        }
      }
    );
  }
}
