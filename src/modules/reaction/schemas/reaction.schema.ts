import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

export enum ReactionType {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  LOVE = 'love',
  SHOCKED = 'shocked',
}

@Entity({ name: 'reactions' })
export class Reaction {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  messageId: ObjectId;

  @Column()
  userId: ObjectId;

  @Column({
    type: 'enum',
    enum: ReactionType,
  })
  type: ReactionType;

  @CreateDateColumn()
  createdAt: Date;
}
