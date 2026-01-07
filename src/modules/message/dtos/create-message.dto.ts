import { MessageAttachment } from "../schemas/message.schema";

export class CreateMessageDto {
  conversationId: string;
  senderId: string;
  metadata: {
    textContent?: string;
    parentId?: string;
    forwardedMessageId?: string;
  };
  attachments: MessageAttachment[];
}