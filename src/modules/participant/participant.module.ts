import { Module } from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { ParticipantController } from './participant.controller';
import { UserModule } from '../user/user.module';
import { DatabaseModule } from '../database.module';

@Module({
  providers: [ParticipantService],
  imports: [UserModule],
  controllers: [ParticipantController],
  exports: [ParticipantService],
})
export class ParticipantModule {}
