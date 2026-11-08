import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, ShopGuard)
@Controller('shops/:shopId/channels')
export class ChannelsController {
  constructor(
    private readonly channels: ChannelsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequireCapability('channels.manage')
  list(@CurrentShop() ctx: ShopContext) {
    return this.prisma.channel.findMany({ where: { shopId: ctx.shopId } });
  }

  @Post()
  @RequireCapability('channels.manage')
  create(@CurrentShop() ctx: ShopContext, @Body() body: any) {
    return this.prisma.channel.create({
      data: {
        shopId: ctx.shopId,
        type: body.type,
        name: body.name,
        providerId: body.providerId,
        config: body.config ?? {},
      },
    });
  }

  @Post(':channelId/send')
  @RequireCapability('conversations.handle')
  async send(@CurrentShop() ctx: ShopContext, @Param('channelId') channelId: string, @Body() body: any) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, shopId: ctx.shopId },
    });
    if (!channel) return { ok: false, error: 'channel_not_found' };
    const adapter = this.channels.get(channel.type);
    if (!adapter) return { ok: false, error: `adapter_not_registered:${channel.type}` };
    return adapter.send({
      channelConfig: (channel.config as Record<string, any>) ?? {},
      recipientId: body.recipientId,
      content: body.content,
    });
  }
}
