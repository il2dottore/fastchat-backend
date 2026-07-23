import { Expose } from 'class-transformer';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

export class DirectConversationMetadata {
  autoDeleteTime?: number; // In seconds
}

export enum GroupAccessibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export class GroupConversationMetadata {
  groupName: string;
  groupDescription: string;
  groupThumbnail: string;
  inviteSlug?: string;
  accessibility?: GroupAccessibility;
}

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity({
  name: 'conversations',
})
export class Conversation {
  @ObjectIdColumn()
  @Expose()
  _id: ObjectId;

  @Column({
    type: 'enum',
    enum: ConversationType,
  })
  @Expose()
  type: string;

  @Column()
  @Expose()
  metadata?: DirectConversationMetadata | GroupConversationMetadata;
}
