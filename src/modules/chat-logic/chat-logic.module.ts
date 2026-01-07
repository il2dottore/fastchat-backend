import { Module } from '@nestjs/common';
import { ChatLogicController } from './chat-logic.controller';
import { ChatLogicService } from './chat-logic.service';

@Module({
  controllers: [ChatLogicController],
  providers: [ChatLogicService]
})
export class ChatLogicModule {}
