import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '../../user/schemas/user.schema';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsNotEmpty()
  avatarUrl: string;

  @IsDateString()
  @IsOptional()
  lastOnline: Date;

  @IsOptional()
  @IsEnum(UserStatus)
  userStatus: UserStatus;
}