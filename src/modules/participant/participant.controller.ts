import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { SetRoleDto } from './dto/set-role.dto';
import { error, success } from 'src/helpers/http.helper';
import { BanParticipantDto } from './dto/ban-participant.dto';
import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { KickParticipantDto } from './dto/kick-paricipant.dto';

@Controller('participants')
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Get('/me/:conversationId')
  @UseGuards(AuthGuard)
  async getMyParticipantInfo(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
  ) {
    try {
      const result = await this.participantService.getParticipant(
        new ObjectId(request['user']._id as string),
        new ObjectId(conversationId),
      );
      return success(
        'Your information in conversation ' + conversationId,
        result,
      );
    } catch (exception) {
      throw error(exception.message);
    }
  }

  // Set role for user in conversation
  @Post('admin-actions/set-role')
  async setRole(@Body() setRoleDto: SetRoleDto) {
    try {
      const result = await this.participantService.setRole(setRoleDto);
      return success('Set role for user successfully');
    } catch (exception) {
      throw error(exception.message);
    }
  }

  // Kick user from conversation
  @Post('admin-actions/kick-participant')
  async kickParticipant(@Body() kickParticipantDto: KickParticipantDto) {
    try {
      const result =
        await this.participantService.kickParticipant(kickParticipantDto);
      return success('Kick user successfully', result);
    } catch (exception) {
      throw error(exception.message);
    }
  }

  // Ban user (does not allow to access or messaging) from conversation
  @Post('admin-actions/ban-participant')
  async banParticipant(@Body() banParticipantDto: BanParticipantDto) {
    try {
      console.log(banParticipantDto);
      const result =
        await this.participantService.banParticipant(banParticipantDto);
      return success('Ban user successfully', result);
    } catch (exception) {
      console.log(exception);
      throw error(exception.message);
    }
  }

  // Unban user
  @Delete('admin-actions/ban-participant')
  async unbanParticipant(
    @Body() unbanParticipantDto: { bannedUser: string; conversationId: string },
  ) {
    try {
      const result = await this.participantService.removeBanFromParticipant(
        unbanParticipantDto.conversationId,
        unbanParticipantDto.bannedUser,
      );
      return success('Unban user successfully', result);
    } catch (exception) {
      throw error(exception.message);
    }
  }

  @Post('leave')
  @UseGuards(AuthGuard)
  async leaveConversation(
    @Req() request: Request,
    @Body() body: { conversationId: string },
  ) {
    try {
      await this.participantService.leaveConversation(
        new ObjectId(request['user']._id),
        new ObjectId(body.conversationId),
      );
      return success('Left conversation successfully');
    } catch (exception) {
      throw error(exception.message);
    }
  }

  @Post('join')
  @UseGuards(AuthGuard)
  async joinConversation(
    @Req() request: Request,
    @Body() body: { conversationId: string },
  ) {
    try {
      await this.participantService.joinConversation(
        new ObjectId(request['user']._id),
        new ObjectId(body.conversationId),
      );
      return success('Joined conversation successfully');
    } catch (exception) {
      throw error(exception.message);
    }
  }
}
