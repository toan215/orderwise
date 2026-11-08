import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { RagService } from './rag/rag.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';

/**
 * AI intake endpoints. The web-chat widget and channel webhook workers call
 * `POST .../conversations/:convId/ai-message` to feed a customer message into
 * the AI pipeline; `GET .../ai/search?q=` exposes RAG retrieval for the admin.
 */
@UseGuards(JwtAuthGuard, ShopGuard)
@Controller()
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly rag: RagService,
  ) {}

  @Post('shops/:shopId/conversations/:convId/ai-message')
  @RequireCapability('conversations.handle')
  async aiMessage(
    @CurrentShop() ctx: ShopContext,
    @Param('convId') convId: string,
    @Body('content') content: string,
  ) {
    return this.ai.handleInbound({ shopId: ctx.shopId, conversationId: convId, content });
  }

  @Get('shops/:shopId/ai/search')
  @RequireCapability('conversations.read')
  async search(@CurrentShop() ctx: ShopContext, @Query('q') q: string) {
    return this.rag.search(ctx.shopId, q ?? '', { topK: 6 });
  }
}
