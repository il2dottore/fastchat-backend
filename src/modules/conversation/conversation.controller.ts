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
import { ConversationService, InviteUserPayload } from './conversation.service';
import { error, getErrorMessage, success } from 'src/helpers/http.helper';
import { ObjectId } from 'mongodb';
import { JoinConversationDto } from './dtos/join-conversation.dto';
import { Request } from 'express';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { User } from '../user/schemas/user.schema';

interface AuthenticatedRequest extends Request {
  user?: User;
}

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
      throw error(getErrorMessage(exception));
    }
  }

  // @UseGuards(AuthGuard)
  @Put(':conversationId')
  async updateConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
    @Body() updateConversationData: Record<string, unknown>,
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
    @Req() request: AuthenticatedRequest,
  ) {
    const user = request.user as User;
    try {
      const result = await this.conversationService.getConversation(
        user,
        new ObjectId(conversationId),
      );
      return success('Data fetched', result[0]);
    } catch (exception) {
      console.log(
        'ConversationController - getConversation() error',
        getErrorMessage(exception),
      );
      throw error(getErrorMessage(exception));
    }
  }

  @Post(':conversationId/invitation')
  async inviteUserToConversation(
    @Param('conversationId') conversationId: string,
    @Body() invitationPayload: InviteUserPayload,
  ) {
    try {
      await this.conversationService.inviteUserToConversation(
        new ObjectId(conversationId),
        invitationPayload,
      );
      return success('This user has been invited successfully.');
    } catch (exception) {
      console.log(exception);
      throw error(getErrorMessage(exception));
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':conversationId')
  deleteConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      const conversationObjectId = new ObjectId(conversationId);
      const user = request.user?._id;

      // Run in background as requested
      this.conversationService
        .deleteConversation(new ObjectId(user), conversationObjectId)
        .catch((err) =>
          console.error('Background deleteConversation error:', err),
        );

      return success('Conversation deletion started');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':conversationId/leave')
  leaveConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      const conversationObjectId = new ObjectId(conversationId);
      const userId = request.user?._id;

      // Run in background as requested
      this.conversationService
        .leaveConversation(new ObjectId(userId), conversationObjectId)
        .catch((err) =>
          console.error('Background leaveConversation error:', err),
        );

      return success('Leaving conversation...');
    } catch (exception) {
      throw error(getErrorMessage(exception));
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
      `Message from conversation ${conversationObjectId.toString()}`,
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
      throw error(getErrorMessage(exception));
    }
  }
}
