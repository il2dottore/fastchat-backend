import { ObjectId } from 'mongodb';
import { Column, Entity, ObjectIdColumn } from 'typeorm';

export enum ParticipantRole {
  MEMBER = 'member',
  ADMINISTRATOR = 'administrator',
  OWNER = 'owner'
}

export class BanStatus {
  isBanned: boolean;
  bannedBy?: ObjectId;
  releaseDate?: Date;
  reason?: string;
}

@Entity({
  name: 'participants'
})
export class Participant {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  conversationId: ObjectId;

  @Column()
  userId: ObjectId;

  @Column({
    type: 'enum',
    enum: ParticipantRole
  })
  role: ParticipantRole;

  @Column()
  banStatus: BanStatus;
}