import { IsString } from 'class-validator';

export class SetRoleDto {
  @IsString()
  setterUserId: string;
  @IsString()
  memberUserId: string;
  @IsString()
  conversationId: string;
  @IsString()
  participantRole: string;
}
