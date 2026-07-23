import { ObjectId } from 'mongodb';
import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity({
  name: 'verification_codes',
})
export class VerificationCode {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column()
  createdAt: Date;

  @Column()
  expiresAt: Date;
}
