import { Module, forwardRef } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ParticipantModule } from '../participant/participant.module';
import { MessageModule } from '../message/message.module';
import { UploadModule } from '../upload/upload.module';
import { ConversationController } from './conversation.controller';

@Module({
  providers: [ConversationService],
  imports: [
    ParticipantModule,
    forwardRef(() => MessageModule),
    UploadModule,
  ],
  exports: [ConversationService],
  controllers: [ConversationController],
})
export class ConversationModule { }
