import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

@Entity({
  name: 'contacts',
})
export class Contact {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  ownerId: ObjectId;

  @Column()
  peerId: ObjectId;

  @CreateDateColumn()
  createdAt: Date;
}
