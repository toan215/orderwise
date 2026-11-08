import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { hasCapability } from '@orderwise/shared';
import type { Capability } from '@orderwise/shared';
import type { ShopContext } from './shop-context';

/**
 * Mutually exclusive to @UseGuards(JwtAuthGuard) usage below — this guard
 * BOTH authenticates and resolves the shop+member context, then checks the
 * requested capabilities.
 */
@Injectable()
export class ShopGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const shopId = req.params?.shopId || req.headers?.['x-shop-id'];
    if (!shopId) throw new ForbiddenException('Missing shop context');

    const member = await this.prisma.shopMember.findUnique({
      where: { shopId_userId: { shopId, userId: user.id } },
      include: { shop: true },
    });
    if (!member) throw new ForbiddenException('Not a member of this shop');

    const caps =
      (this.reflector.getAllAndOverride<Capability[]>('capabilities', [
        context.getHandler(),
        context.getClass(),
      ]) as Capability[]) ?? [];
    const role = member.role as Parameters<typeof hasCapability>[0];
    if (caps.length > 0 && !caps.some((c) => hasCapability(role, c))) {
      throw new ForbiddenException('Insufficient permission');
    }

    req.shopCtx = {
      shopId: member.shopId,
      shop: { id: member.shop.id, name: member.shop.name },
      member: { userId: user.id, role: member.role },
      user,
    } satisfies ShopContext;

    return true;
  }
}
