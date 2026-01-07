import { ObjectId } from 'mongodb';
import { Entity, Column, ObjectIdColumn } from 'typeorm';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  HIDDEN = 'hidden',
}

@Entity({
  name: 'users',
})
export class User {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  email: string;

  @Column({
    nullable: true,
  })
  username: string | null;

  @Column({
    nullable: true
  })
  password: string;

  @Column({
    nullable: true
  })
  fullname: string | null;

  @Column({
    nullable: true,
  })
  avatarUrl: string | null;

  @Column({
    nullable: true,
  })
  lastOnline: Date | null;

  @Column({
    nullable: true,
  })
  callSocketId: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    nullable: true,
  })
  userStatus: UserStatus | null;

  @Column({
    nullable: true,
  })
  fcmToken: string | null;
  @Column({
    default: false
  })
  isVerified: boolean;
}