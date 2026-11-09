import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WebChatService } from './web-chat.service';

/**
 * Public web-chat endpoints for the customer-facing widget. No JWT, no shop
 * guard: the shop is addressed by slug and the visitor is identified by a
 * random token held in their browser (localStorage). Safe as long as the shop
 * intentionally exposes a widget; data is scoped to that shop + customer.
 */
@Controller('public/web-chat')
export class WebChatController {
  constructor(private readonly webChat: WebChatService) {}

  @Get(':shopSlug/start')
  start(@Param('shopSlug') shopSlug: string, @Query('token') token: string) {
    return this.webChat.start(shopSlug, token);
  }

  @Post(':shopSlug/send')
  send(@Param('shopSlug') shopSlug: string, @Body('token') token: string, @Body('content') content: string) {
    if (!token) throw new BadRequestException('Missing token');
    if (!content?.trim()) throw new BadRequestException('Missing content');
    return this.webChat.send(shopSlug, token, String(content));
  }

  @Get(':shopSlug/messages')
  messages(@Param('shopSlug') shopSlug: string, @Query('token') token: string) {
    if (!token) throw new BadRequestException('Missing token');
    return this.webChat.messages(shopSlug, token);
  }

  @Post(':shopSlug/confirm')
  confirm(@Param('shopSlug') shopSlug: string, @Body('token') token: string, @Body('orderId') orderId: string) {
    if (!token) throw new BadRequestException('Missing token');
    if (!orderId) throw new BadRequestException('Missing orderId');
    return this.webChat.confirmOrder(shopSlug, token, String(orderId));
  }
}
