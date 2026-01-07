import { forwardRef, Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { UserModule } from '../user/user.module';
import { MessageSocketGateway } from './message.gateway';
import { ParticipantModule } from '../participant/participant.module';
import { UploadModule } from '../upload/upload.module';
import { ReactionModule } from '../reaction/reaction.module';

@Module({
  providers: [MessageService, MessageSocketGateway],
  controllers: [MessageController],
  imports: [
    forwardRef(() => ConversationModule),
    UserModule,
    ParticipantModule,
    UploadModule,
    ReactionModule,
  ],
  exports: [MessageService, MessageSocketGateway],
})
export class MessageModule { }
