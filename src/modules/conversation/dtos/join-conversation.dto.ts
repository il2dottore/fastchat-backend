import { IsString } from "class-validator";

export class JoinConversationDto {
  @IsString()
  userId: string;
}