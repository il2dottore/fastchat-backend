import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, MongoEntityManager } from 'typeorm';
import { User } from './user/schemas/user.schema';
import { Conversation } from './conversation/schemas/conversation.schema';
import { Participant } from './participant/schemas/participant.schema';
import { AuthToken } from './auth/schemas/auth-token.schema';
import { Message } from './message/schemas/message.schema';
import { ContactModule } from './contact/contact.module';
import { Contact } from './contact/schemas/contact.schema';
import { BlockedUser } from './chat-logic/schemas/blocked-user.schema';
import { VerificationCode } from './auth/schemas/verification-code.schema';
import { Reaction } from './reaction/schemas/reaction.schema';


export const MongoProvider = [
  {
    provide: MongoEntityManager,
    useFactory: (dataSource: DataSource) => dataSource.mongoManager,
    inject: [DataSource],
  },
];

@Global()
@Module({
  providers: [...MongoProvider],
  exports: [...MongoProvider],
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      host: 'localhost',
      port: 27017,
      username: 'sussybaka',
      password: '1234567890',
      database: 'base-project-4',
      entities: [
        User,
        Conversation,
        Participant,
        AuthToken,
        Message,
        Contact,
        BlockedUser,
        VerificationCode,
        Reaction,
      ],
      authSource: 'admin',
      directConnection: true,
      synchronize: true,
    }),
  ],
  controllers: [],
})
export class DatabaseModule { }
