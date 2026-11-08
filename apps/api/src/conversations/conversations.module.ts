import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChannelsService } from '../channels/channels.service';
import { ChannelsModule } from '../channels/channels.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [ChannelsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, SocketGateway],
  exports: [ConversationsService],
})
export class ConversationsModule {}
