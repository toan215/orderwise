import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { hasCapability } from '@orderwise/shared';
import type { Capability } from '@orderwise/shared';
import type { User } from '@orderwise/prisma';

export const SHOP_CTX_KEY = 'shopCtx';

export interface ShopContext {
  shopId: string;
  shop: { id: string; name: string };
  member: { userId: string; role: string };
  user: User;
}

export const RequireCapability = (...caps: Capability[]) =>
  SetMetadata('capabilities', caps);

export const CurrentShop = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ShopContext => {
    const req = ctx.switchToHttp().getRequest();
    const shopCtx = req.shopCtx as ShopContext;
    if (!shopCtx) throw new UnauthorizedException('Missing shop context');
    return shopCtx;
  },
);

export function assertCapability(ctx: ShopContext, ...caps: Capability[]) {
  const role = ctx.member.role as Parameters<typeof hasCapability>[0];
  const allowed = caps.some((c) => hasCapability(role, c));
  if (!allowed) throw new ForbiddenException('Insufficient permission');
}
