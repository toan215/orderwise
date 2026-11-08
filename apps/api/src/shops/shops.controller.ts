import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';
import { CreateShopDto, UpdateShopDto, AddMemberDto } from './dto/shop.dto';

// Shop OWNERS manage shops + staff without requiring an existing shop membership,
// so these endpoints are guarded by plain JWT (handled via AuthGuard in a parent
// design). Here we keep them simple: look-up by shopId param with membership check.
@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Post()
  create(@Body() dto: CreateShopDto) {
    return this.shops.create(dto);
  }

  @UseGuards(JwtAuthGuard, ShopGuard)
  @Get(':shopId')
  @RequireCapability('shop.update')
  detail(@CurrentShop() ctx: ShopContext) {
    return this.shops.detail(ctx.shopId);
  }

  @UseGuards(JwtAuthGuard, ShopGuard)
  @Patch(':shopId')
  @RequireCapability('shop.update')
  update(@CurrentShop() ctx: ShopContext, @Body() dto: UpdateShopDto) {
    return this.shops.update(ctx.shopId, dto);
  }

  @UseGuards(JwtAuthGuard, ShopGuard)
  @Post(':shopId/members')
  @RequireCapability('staff.manage')
  addMember(@CurrentShop() ctx: ShopContext, @Body() dto: AddMemberDto) {
    return this.shops.addMember(ctx.shopId, dto);
  }

  @UseGuards(JwtAuthGuard, ShopGuard)
  @Get(':shopId/members')
  @RequireCapability('staff.manage')
  members(@CurrentShop() ctx: ShopContext) {
    return this.shops.members(ctx.shopId);
  }
}
