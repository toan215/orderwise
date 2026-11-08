import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShopGuard } from '../common/shop.guard';
import { CurrentShop, RequireCapability, ShopContext } from '../common/shop-context';
import { CreateProductDto } from './dto/create-product.dto';

@UseGuards(JwtAuthGuard, ShopGuard)
@Controller('shops/:shopId/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequireCapability('catalog.read')
  list(
    @CurrentShop() ctx: ShopContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.products.list(ctx.shopId, q, status);
  }

  @Post()
  @RequireCapability('catalog.manage')
  create(@CurrentShop() ctx: ShopContext, @Body() dto: CreateProductDto) {
    return this.products.create(ctx.shopId, dto);
  }

  @Get(':id')
  @RequireCapability('catalog.read')
  detail(@CurrentShop() ctx: ShopContext, @Param('id') id: string) {
    return this.products.detail(ctx.shopId, id);
  }

  @Patch(':id')
  @RequireCapability('catalog.manage')
  update(
    @CurrentShop() ctx: ShopContext,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.products.update(ctx.shopId, id, dto);
  }
}
