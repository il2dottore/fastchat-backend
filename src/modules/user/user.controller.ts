import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { UserService } from './user.service';
import { CreateUserDto } from '../conversation/dtos/create-user.dto';
import { error, getErrorMessage, success } from 'src/helpers/http.helper';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Request } from 'express';
import { ContactService } from '../contact/contact.service';
import { User } from './schemas/user.schema';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly contactService: ContactService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@Req() request: AuthenticatedRequest) {
    console.log('getProfile()');
    try {
      const result = await this.userService.find({
        where: {
          _id: request.user._id,
        },
      });
      if (result.length === 0) {
        throw error('No user found');
      }
      const user = result[0];
      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as Partial<typeof userWithoutPassword>)
        .password;
      return success('Success', userWithoutPassword);
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  // Get user information by MongoDB ID
  @UseGuards(AuthGuard)
  @Get(':userId')
  async getUserInfo(
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      const result = await this.userService.find({
        _id: new ObjectId(userId),
      });
      if (result.length === 0) {
        throw error('Can not find user with ID ' + userId);
      }
      const user = result[0];
      const hasContactWithMe = await this.contactService.contactExists(
        request.user._id,
        user._id,
      );
      if (hasContactWithMe) {
        user['hasContactWithMe'] = true;
      } else {
        user['hasContactWithMe'] = false;
      }
      return success('Return data', user);
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @Put(':userId')
  updateUserCredentials(@Param('userId') userId: string) {
    void new ObjectId(userId);
  }

  @Get(':userId/conversations')
  async getConversations(@Param('userId') userId: string) {
    const userObjectId = new ObjectId(userId);
    const conversations =
      await this.userService.getConversationsByUser(userObjectId);
    return success('Conversation', conversations);
  }

  @Post('registration')
  async registration(@Body() createUserDto: CreateUserDto) {
    try {
      await this.userService.create(createUserDto);
      return success('Registration successfully.');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }

  @UseGuards(AuthGuard)
  @Post('fcm-token')
  async updateFcmToken(
    @Req() request: AuthenticatedRequest,
    @Body() body: { token: string | null },
  ) {
    try {
      await this.userService.updateFcmToken(request.user._id, body.token);
      return success('FCM token updated successfully');
    } catch (exception) {
      throw error(getErrorMessage(exception));
    }
  }
}
