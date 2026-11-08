import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';

@UseGuards(JwtAuthGuard, ShopGuard)
@Controller('shops/:shopId/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequireCapability('orders.manage', 'orders.create')
  list(@CurrentShop() ctx: ShopContext, @Query('status') status?: string, @Query('q') q?: string) {
    return this.orders.list(ctx.shopId, status, q);
  }

  @Post()
  @RequireCapability('orders.create')
  create(@CurrentShop() ctx: ShopContext, @Body() body: any) {
    return this.orders.create(ctx.shopId, { ...body, createdById: ctx.user.id });
  }

  @Get(':orderId')
  @RequireCapability('orders.manage', 'orders.create')
  detail(@CurrentShop() ctx: ShopContext, @Param('orderId') orderId: string) {
    return this.orders.detail(ctx.shopId, orderId);
  }

  @Post(':orderId/items')
  @RequireCapability('orders.create')
  addLine(@CurrentShop() ctx: ShopContext, @Param('orderId') orderId: string, @Body() body: any) {
    return this.orders.addLine(ctx.shopId, orderId, body);
  }

  @Post(':orderId/request-confirm')
  @RequireCapability('orders.create')
  requestConfirm(@CurrentShop() ctx: ShopContext, @Param('orderId') orderId: string) {
    return this.orders.requestCustomerConfirm(ctx.shopId, orderId);
  }

  @Post(':orderId/customer-confirm')
  @RequireCapability('orders.create')
  customerConfirm(@CurrentShop() ctx: ShopContext, @Param('orderId') orderId: string, @Body('accepted') accepted: boolean) {
    return this.orders.confirmByCustomer(ctx.shopId, orderId, accepted);
  }

  @Post(':orderId/confirm')
  @RequireCapability('orders.manage')
  confirm(@CurrentShop() ctx: ShopContext, @Param('orderId') orderId: string) {
    return this.orders.confirm(ctx.shopId, orderId);
  }

  @Post(':orderId/cancel')
  @RequireCapability('orders.manage', 'orders.create')
  cancel(@CurrentShop() ctx: ShopContext, @Param('orderId') orderId: string, @Body() body: any) {
    return this.orders.cancel(ctx.shopId, orderId, body.reason, body.note);
  }
}
