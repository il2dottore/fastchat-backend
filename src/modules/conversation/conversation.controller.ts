import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateConversationDto } from './dtos/create-conversation.dto';
import { ConversationService } from './conversation.service';
import { error, success } from 'src/helpers/http.helper';
import { ObjectId } from 'mongodb';
import { JoinConversationDto } from './dtos/join-conversation.dto';
import { Request } from 'express';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { BlockUserDto } from '../chat-logic/dtos/block-user.dto';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}
  @Post()
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
  ) {
    try {
      const conversation = await this.conversationService.createConversation(
        createConversationDto,
      );
      return success('Conversation created successfully.', conversation);
    } catch (exception) {
      throw error(exception.message);
    }
  }

  // @UseGuards(AuthGuard)
  @Put(':conversationId')
  async updateConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
    @Body() updateConversationData: any,
  ) {
    await this.conversationService.updateConversation(
      conversationId,
      updateConversationData,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':conversationId')
  async getConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
  ) {
    const user = request['user'];
    try {
      const result = await this.conversationService.getConversation(
        user,
        new ObjectId(conversationId),
      );
      return success('Data fetched', result[0]);
    } catch (exception) {
      console.log(
        'ConversationController - getConversation() error',
        exception.message,
      );
      throw error(exception.message);
    }
  }

  @Post(':conversationId/invitation')
  async inviteUserToConversation(
    @Param('conversationId') conversationId: string,
    @Body() invitationPayload: any,
  ) {
    try {
      await this.conversationService.inviteUserToConversation(
        new ObjectId(conversationId),
        invitationPayload,
      );
      return success('This user has been invited successfully.');
    } catch (exception) {
      console.log(exception);
      throw error(exception.message);
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':conversationId')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
  ) {
    try {
      const conversationObjectId = new ObjectId(conversationId);
      const user = request['user']._id as string;

      // Run in background as requested
      this.conversationService
        .deleteConversation(new ObjectId(user), conversationObjectId)
        .catch((err) =>
          console.error('Background deleteConversation error:', err),
        );

      return success('Conversation deletion started');
    } catch (exception) {
      throw error(exception.message);
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':conversationId/leave')
  async leaveConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
  ) {
    try {
      const conversationObjectId = new ObjectId(conversationId);
      const userId = request['user']._id;

      // Run in background as requested
      this.conversationService
        .leaveConversation(userId, conversationObjectId)
        .catch((err) =>
          console.error('Background leaveConversation error:', err),
        );

      return success('Leaving conversation...');
    } catch (exception) {
      throw error(exception.message);
    }
  }

  @Get(':conversationId/participants')
  async getParticipants(@Param('conversationId') conversationId: string) {
    const conversationObjectId = new ObjectId(conversationId);
    const participants =
      await this.conversationService.getParticipants(conversationObjectId);
    return success('', participants);
  }

  @Get(':conversationId/messages')
  async getMessages(@Param('conversationId') conversationId: string) {
    const conversationObjectId = new ObjectId(conversationId);
    const messages =
      await this.conversationService.getMessages(conversationObjectId);
    return success(
      `Message from conversation ${conversationObjectId}`,
      messages,
    );
  }

  @Post(':conversationId/join')
  async joinConversation(
    @Param('conversationId') conversationId: string,
    @Body() joinConversationDto: JoinConversationDto,
  ) {
    try {
      const conversationObjectId = new ObjectId(conversationId);
      await this.conversationService.joinConversation(
        conversationObjectId,
        joinConversationDto,
      );
      return success('Joined');
    } catch (exception) {
      throw error(exception.message);
    }
  }
}
