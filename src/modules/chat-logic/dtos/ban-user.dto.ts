import { IsString } from 'class-validator';

export class BanUserDto {
  @IsString()
  blockerUserId: string;
  @IsString()
  blockedUserId: string;
}
