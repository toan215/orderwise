import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export function orderStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'success';
    case 'AWAITING_CUSTOMER_CONFIRM':
    case 'AWAITING_SELLER_CONFIRM':
    case 'SHIPPING':
      return 'warning';
    case 'DRAFT':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'default';
  }
}

export function conversationStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case 'OPEN':
      return 'success';
    case 'HANDED_OVER':
      return 'warning';
    case 'PAUSED':
      return 'secondary';
    case 'CLOSED':
      return 'muted';
    default:
      return 'default';
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Chủ cửa hàng';
    case 'MANAGER':
      return 'Quản lý';
    case 'SELLER':
      return 'Nhân viên bán';
    case 'VIEWER':
      return 'Xem';
    default:
      return role;
  }
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Nháp';
    case 'AWAITING_CUSTOMER_CONFIRM':
      return 'Chờ khách xác nhận';
    case 'AWAITING_SELLER_CONFIRM':
      return 'Chờ bán hàng xác nhận';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'SHIPPING':
      return 'Đang giao';
    case 'COMPLETED':
      return 'Đã hoàn tất';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function originLabel(origin: string): string {
  switch (origin) {
    case 'AI':
      return 'AI';
    case 'SELLER':
      return 'NV';
    case 'CUSTOMER':
      return 'KH';
    default:
      return origin;
  }
}
