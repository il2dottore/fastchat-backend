import { IsNumber, IsString } from 'class-validator';

export class BanParticipantDto {
  @IsString()
  conversationId: string;
  @IsNumber()
  banDuration: number;
  @IsString()
  bannedUser: string;
  @IsString()
  bannedBy: string;
  @IsString()
  reason: string;
}
