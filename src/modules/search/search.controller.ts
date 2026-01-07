import { Controller, Get, Param, Query } from '@nestjs/common';
import { error, success } from 'src/helpers/http.helper';
import { SearchService } from './search.service';
import { ObjectId } from 'mongodb';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService
  ) { }
  @Get("user/email/:email")
  async searchUserByEmail(
    @Param('email') email: string,
  ) {
    const user = await this.searchService.searchUserByEmail(email);
    if (null === user) {
      throw error('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return success(
      'User',
      userWithoutPassword,
    );
  }

  @Get("participant/:conversationId/name/:participantName")
  async searchParticipantByName(
    @Param('email') conversationId: string,
    @Param('email') participantName: string,
  ) { }

  @Get("message/:conversationId")
  async searchMessageByKeyword(
    @Param('conversationId') conversationId: string,
    @Query('keyword') keyword: string,
  ) {
    const searchResult = await this.searchService.searchMessageByKeyword(
      new ObjectId(conversationId),
      keyword
    );
    return success(
      'Search result',
      searchResult
    );
  }
  @Get("global")
  async searchGlobal(
    @Query('keyword') keyword: string,
  ) {
    const result = await this.searchService.searchGlobal(keyword);
    return success(
      'Search result',
      result
    );
  }
}
