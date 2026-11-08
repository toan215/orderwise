import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(shopId: string, q?: string, status?: string) {
    return this.prisma.product.findMany({
      where: {
        shopId,
        ...(q || status
          ? {
              AND: {
                ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
                ...(status ? { status: status as any } : {}),
              },
            }
          : {}),
      },
      include: { variants: { include: { inventory: true } }, media: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  detail(shopId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, shopId },
      include: { variants: { include: { inventory: true } }, media: true },
    });
  }

  async create(shopId: string, dto: CreateProductDto) {
    let productId: string;
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopId,
          name: dto.name,
          sku: dto.sku,
          description: dto.description,
          active: dto.active ?? true,
          hasVariants: dto.hasVariants ?? false,
        },
      });
      productId = product.id;
      if (dto.variants?.length) {
        for (const v of dto.variants) {
          await tx.productVariant.create({
            data: {
              productId: product.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              optionValues: JSON.stringify(v.optionValues ?? []),
            },
          });
        }
      }
    });
    // Query AFTER commit so the detail reflects the persisted row.
    return this.detail(shopId, productId!);
  }

  async update(shopId: string, id: string, dto: Partial<CreateProductDto>) {
    await this.prisma.product.updateMany({ where: { id, shopId }, data: dto });
    return this.detail(shopId, id);
  }
}
