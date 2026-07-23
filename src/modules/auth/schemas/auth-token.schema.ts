import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

@Entity({
  name: 'auth_tokens',
})
export class AuthToken {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  refreshToken: string;

  @Column()
  userId: ObjectId;

  @CreateDateColumn()
  createdAt: Date;
}
