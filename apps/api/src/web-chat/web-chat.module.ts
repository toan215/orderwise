import { Module } from '@nestjs/common';
import { WebChatController } from './web-chat.controller';
import { WebChatService } from './web-chat.service';
import { AiModule } from '../ai/ai.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AiModule, OrdersModule],
  controllers: [WebChatController],
  providers: [WebChatService],
  exports: [WebChatService],
})
export class WebChatModule {}
