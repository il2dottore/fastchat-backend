import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { BlockUserDto } from './dtos/block-user.dto';
import { ChatLogicService } from './chat-logic.service';
import { error, getErrorMessage, success } from 'src/helpers/http.helper';

@Controller('chat-logic')
export class ChatLogicController {
  constructor(private readonly chatLogicService: ChatLogicService) {}
  // Block user
  @Post('block-user')
  async blockUser(@Body() blockUserDto: BlockUserDto) {
    try {
      await this.chatLogicService.blockUser(blockUserDto);
      return success('Blocked');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  // Delete block pair
  @Delete('block-user')
  async deleteBlockPair(@Body() blockUserDto: BlockUserDto) {
    try {
      await this.chatLogicService.deleteBlockPair(blockUserDto);
      return success('Block pair deleted');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  // Get blocked users by user
  @Get('block-user/block-list/:userId')
  async getBlockList(@Param('userId') userId: string) {
    try {
      const result = await this.chatLogicService.getBlockedList(userId);
      return success('Blocked', result);
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }
}
