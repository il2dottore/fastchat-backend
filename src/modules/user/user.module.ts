import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ContactModule } from '../contact/contact.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [
    ContactModule,
  ],
  exports: [UserService],
})
export class UserModule { }
