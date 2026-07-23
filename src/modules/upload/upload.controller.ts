import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseInterceptors,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { success } from 'src/helpers/http.helper';
import { MongoEntityManager } from 'typeorm';
import { User } from '../user/schemas/user.schema';
import { ObjectId } from 'mongodb';
import { Conversation } from '../conversation/schemas/conversation.schema';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly entityManager: MongoEntityManager,
  ) {}

  @Post('group-thumbnail')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupThumbnail(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      conversationId: string;
    },
  ) {
    const fileExtension = file.originalname.split('.').pop();
    const avatarPath = `group-thumbnail/${body.conversationId}.${fileExtension}`;
    const result = await this.uploadService.uploadFile(avatarPath, file);
    await this.entityManager.updateOne(
      Conversation,
      {
        _id: new ObjectId(body.conversationId),
      },
      {
        $set: {
          'metadata.groupThumbnail': result.url,
        },
      },
    );
    return success('Uploaded', result);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      userId: string;
    },
  ) {
    const fileExtension = file.originalname.split('.').pop();
    const avatarPath = `avatars/${body.userId}.${fileExtension}`;
    const result = await this.uploadService.uploadFile(avatarPath, file);
    await this.entityManager.updateOne(
      User,
      {
        _id: new ObjectId(body.userId),
      },
      {
        $set: {
          avatarUrl: result.url,
        },
      },
    );
    return success('Uploaded', result);
  }

  @Post('attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMessageAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      userId: string;
      conversationId: string;
    },
  ) {
    const timenow = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const avatarPath = `attachments/${body.userId}_${body.conversationId}_${timenow}.${fileExtension}`;
    const result = await this.uploadService.uploadFile(avatarPath, file);
    return success('Uploaded file', result);
  }
}
