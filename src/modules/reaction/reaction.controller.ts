import { Controller, Get, Param } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ObjectId } from 'mongodb';
import { success } from 'src/helpers/http.helper';

@Controller('reactions')
export class ReactionController {
    constructor(private readonly reactionService: ReactionService) { }

    @Get(':messageId')
    async getReactions(@Param('messageId') messageId: string) {
        const reactions = await this.reactionService.getReactionsByMessage(new ObjectId(messageId));
        return success('Reactions retrieved successfully', reactions);
    }
}
