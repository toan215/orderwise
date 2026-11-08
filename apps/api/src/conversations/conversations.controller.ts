import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';

@UseGuards(JwtAuthGuard, ShopGuard)
@Controller('shops/:shopId/conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  @RequireCapability('conversations.read')
  list(
    @CurrentShop() ctx: ShopContext,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('channelId') channelId?: string,
  ) {
    return this.conversations.list(ctx.shopId, { status, q, channelId });
  }

  @Get(':convId')
  @RequireCapability('conversations.read')
  detail(@CurrentShop() ctx: ShopContext, @Param('convId') convId: string) {
    return this.conversations.detail(ctx.shopId, convId);
  }

  @Get(':convId/messages')
  @RequireCapability('conversations.read')
  messages(@CurrentShop() ctx: ShopContext, @Param('convId') convId: string) {
    return this.conversations.messages(ctx.shopId, convId);
  }

  @Post(':convId/send')
  @RequireCapability('conversations.handle')
  send(@CurrentShop() ctx: ShopContext, @Param('convId') convId: string, @Body('content') content: string) {
    return this.conversations.sendAsSeller(ctx, convId, content);
  }

  @Post(':convId/take-over')
  @RequireCapability('conversations.handle')
  takeOver(@CurrentShop() ctx: ShopContext, @Param('convId') convId: string) {
    return this.conversations.takeOver(ctx, convId);
  }

  @Post(':convId/pause-ai')
  @RequireCapability('conversations.handle')
  pauseAi(@CurrentShop() ctx: ShopContext, @Param('convId') convId: string, @Body('paused') paused: boolean) {
    return this.conversations.setAiEnabled(ctx, convId, !paused);
  }
}
