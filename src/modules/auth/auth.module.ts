import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { TokenService } from 'src/shared/services/token.service';
import { MailService } from 'src/shared/services/mail.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService, MailService],
  imports: [
    UserModule,
  ],
  exports: [AuthService]
})
export class AuthModule { }
