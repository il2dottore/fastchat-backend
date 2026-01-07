import { IsString } from "class-validator";

export class BlockUserDto {
  @IsString()
  blockerUserId: string;
  @IsString()
  blockedUserId: string;
}