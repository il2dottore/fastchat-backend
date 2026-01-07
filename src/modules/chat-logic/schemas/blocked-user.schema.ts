import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

@Entity({
  name: 'blocked_users'
})
export class BlockedUser {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  blockerUserId: ObjectId;

  @Column()
  blockedUserId: ObjectId;

  @CreateDateColumn()
  createdAt: Date;
}