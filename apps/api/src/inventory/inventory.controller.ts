import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, ShopGuard)
@Controller('shops/:shopId/inventory')
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequireCapability('inventory.read')
  async list(@CurrentShop() ctx: ShopContext) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { shopId: ctx.shopId },
      include: { variant: { include: { product: true } } },
    });
    return items.map((i) => ({
      variantId: i.variantId,
      onHand: i.onHand,
      onHold: i.onHold,
      stockedOut: i.stockedOut,
      sellable: i.onHand - i.onHold - i.stockedOut,
      lowStockAlert: i.lowStockAlert,
      variant: i.variant,
    }));
  }

  @Get('sellable')
  @RequireCapability('inventory.read')
  sellable(@CurrentShop() ctx: ShopContext, @Query('variantId') variantId: string) {
    return this.inventory.sellableByVariant(variantId);
  }
}
