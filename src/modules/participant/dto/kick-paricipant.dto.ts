import { IsString } from "class-validator";

export class KickParticipantDto {
  @IsString()
  kickedUserId: string;
  @IsString()
  conversationId: string;
}