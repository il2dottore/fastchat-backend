import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

export class MessageMetadata {
  parentId?: ObjectId | null;
  forwardedMessageId?: ObjectId | null;
  textContent?: string | null;
}

export class MessageAttachment {
  attachmentUrl: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
}

@Entity({
  name: 'messages',
})
export class Message {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  conversationId: ObjectId;

  @Column()
  senderId: ObjectId;

  @Column()
  isModified: boolean = false;

  @Column()
  isDeleted: boolean = false;

  @Column()
  metadata: MessageMetadata | null;

  @Column()
  attachments: MessageAttachment[];

  @CreateDateColumn()
  createdAt: Date;
}
