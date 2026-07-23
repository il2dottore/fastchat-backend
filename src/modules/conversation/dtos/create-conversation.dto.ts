import { Expose } from 'class-transformer';
import { IsArray, IsObject, IsString } from 'class-validator';
import {
  DirectConversationMetadata,
  GroupConversationMetadata,
} from '../schemas/conversation.schema';

export class CreateConversationDto {
  @IsString()
  type: string;

  /**
   * First member in the conversation will be an owner, if the conversation type is
   * DIRECT MESSAGE, both are owner.
   */
  @IsArray()
  owners: string[];

  @IsObject()
  metadata: any;
}
