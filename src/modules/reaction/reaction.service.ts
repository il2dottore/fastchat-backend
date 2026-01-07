import { Injectable } from '@nestjs/common';
import { MongoEntityManager } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Reaction, ReactionType } from './schemas/reaction.schema';
import { Message } from '../message/schemas/message.schema';

@Injectable()
export class ReactionService {
    constructor(
        private readonly entityManager: MongoEntityManager,
    ) { }

    async addReaction(userId: ObjectId, messageId: ObjectId, type: ReactionType) {
        // Check if message exists
        const message = await this.entityManager.findOne(Message, { where: { _id: messageId } });
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if reaction already exists for this user and message
        const existingReaction = await this.entityManager.findOne(Reaction, {
            where: {
                userId: userId,
                messageId: messageId,
            }
        });

        if (existingReaction) {
            // Update existing reaction
            existingReaction.type = type;
            return await this.entityManager.save(existingReaction);
        } else {
            // Create new reaction
            const reaction = new Reaction();
            reaction.messageId = messageId;
            reaction.userId = userId;
            reaction.type = type;
            return await this.entityManager.save(reaction);
        }
    }

    async removeReaction(userId: ObjectId, messageId: ObjectId) {
        const result = await this.entityManager.deleteOne(Reaction, {
            userId: userId,
            messageId: messageId,
        });
        return result.deletedCount > 0;
    }

    async getReactionsByMessage(messageId: ObjectId) {
        return await this.entityManager.find(Reaction, {
            where: { messageId: messageId }
        });
    }
}
