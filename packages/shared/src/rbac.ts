import { MemberRole } from '@orderwise/prisma';

/**
 * RBAC capability map per role.
 * OWNER  -> full access on the shop
 * MANAGER -> catalog, policies, orders, inventory, channels, staff (no owner-level)
 * SELLER  -> conversations, orders, customers
 * VIEWER  -> read-only
 */
export type Capability =
  | 'shop.update'
  | 'staff.manage'
  | 'catalog.manage'
  | 'catalog.read'
  | 'policy.manage'
  | 'channels.manage'
  | 'conversations.handle'
  | 'conversations.read'
  | 'orders.create'
  | 'orders.manage'
  | 'inventory.manage'
  | 'inventory.read'
  | 'reports.view'
  | 'customer.manage'
  | 'settings.manage';

export const ROLE_CAPABILITIES: Record<MemberRole, ReadonlySet<Capability>> = {
  OWNER: new Set([
    'shop.update',
    'staff.manage',
    'catalog.manage',
    'catalog.read',
    'policy.manage',
    'channels.manage',
    'conversations.handle',
    'conversations.read',
    'orders.create',
    'orders.manage',
    'inventory.manage',
    'inventory.read',
    'reports.view',
    'customer.manage',
    'settings.manage',
  ]),
  MANAGER: new Set([
    'catalog.manage',
    'catalog.read',
    'policy.manage',
    'channels.manage',
    'conversations.handle',
    'conversations.read',
    'orders.create',
    'orders.manage',
    'inventory.manage',
    'inventory.read',
    'reports.view',
    'customer.manage',
  ]),
  SELLER: new Set([
    'catalog.read',
    'conversations.handle',
    'conversations.read',
    'orders.create',
    'customer.manage',
  ]),
  VIEWER: new Set(['catalog.read', 'conversations.read', 'inventory.read', 'reports.view']),
};

export function hasCapability(role: MemberRole, cap: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.has(cap) ?? false;
}
