import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MessageModule } from './modules/message/message.module';
import { ParticipantModule } from './modules/participant/participant.module';
import { DatabaseModule } from './modules/database.module';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './shared/services/token.service';
import { UploadModule } from './modules/upload/upload.module';
import { SearchModule } from './modules/search/search.module';
import { ContactModule } from './modules/contact/contact.module';
import { ChatLogicModule } from './modules/chat-logic/chat-logic.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReactionModule } from './modules/reaction/reaction.module';

@Global()
@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    UserModule,
    ConversationModule,
    MessageModule,
    ParticipantModule,
    // Third party modules
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    UploadModule,
    SearchModule,
    ContactModule,
    ChatLogicModule,
    ChatLogicModule,
    NotificationModule,
    ReactionModule,
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class AppModule {}
