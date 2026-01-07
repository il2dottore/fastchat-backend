import { Controller, Get, Param } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dtos/create-message.dto';
import { error, success } from 'src/helpers/http.helper';
import { ObjectId } from 'mongodb';

@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService
  ) { }
  @Get('test')
  async createMessage() {
    try {
      const createMessageDto: CreateMessageDto = {
        conversationId: '68fba182e3d051cfa1e4a94c',
        senderId: '68f7bf08e5780a024d105b3c',
        metadata: {
          parentId: '6925ddd07e0fdf9b7d626efa',
          textContent: 'nigger',
        },
        attachments: [],
      };
      const message = await this.messageService.createMessage(createMessageDto);
      return success('Message created successfully', message);
    } catch (exception) {
      throw error(exception.message);
    }
  }

  @Get('last-messages/:userId')
  async getLastMessages(
    @Param('userId') userId: string
  ) {
    const lastMessages = await this.messageService.getLastMessageFromConversations(
      new ObjectId(userId),
    );
    return success('Last message', lastMessages);
  }
}
