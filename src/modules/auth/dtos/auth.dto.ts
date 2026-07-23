import { IsEmail, IsNotEmpty } from 'class-validator';

export class AuthUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
