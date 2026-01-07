import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

@Entity({
  name: 'banned_users'
})
export class BannedUser {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  bannedUserId: ObjectId;

  @Column()
  conversationId: ObjectId;

  @Column()
  releaseDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}