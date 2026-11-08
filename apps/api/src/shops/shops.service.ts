import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto, UpdateShopDto, AddMemberDto } from './dto/shop.dto';
import { slugify } from '../common/slugify';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShopDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    // Owner is inferred from authenticated user; simplified: require a userId.
    if (!dto.ownerUserId) throw new UnauthorizedException('Owner required');
    const shop = await this.prisma.shop.create({
      data: { name: dto.name, slug, description: dto.description, currency: dto.currency },
    });
    await this.prisma.shopMember.create({
      data: { shopId: shop.id, userId: dto.ownerUserId, role: 'OWNER' },
    });
    return shop;
  }

  async detail(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(shopId: string, dto: UpdateShopDto) {
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }

  async addMember(shopId: string, dto: AddMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new ConflictException('User not found; ask them to register first');
    const exists = await this.prisma.shopMember.findUnique({
      where: { shopId_userId: { shopId, userId: user.id } },
    });
    if (exists) throw new ConflictException('User already a member');
    return this.prisma.shopMember.create({
      data: { shopId, userId: user.id, role: dto.role },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
  }

  members(shopId: string) {
    return this.prisma.shopMember.findMany({
      where: { shopId },
      include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true } } },
    });
  }
}
