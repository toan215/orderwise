// ---------------------------------------------------------------------------
// Typed views of the Orderwise API responses (mirrors src/domain model).
// ---------------------------------------------------------------------------

export type Capability = string;

export interface MeUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
}

export interface MyShop {
  id: string;
  name: string;
  slug: string;
  role: string;
  capabilities: Capability[];
}

export interface MeResponse {
  user: MeUser;
  shops: MyShop[];
}

export interface AuthResponse {
  user: MeUser;
  accessToken: string;
  refreshToken: string;
}

export interface Customer {
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  identifiers?: Record<string, string>;
}

export interface ChannelRef {
  id: string;
  name: string;
  type: string;
}

export interface Conversation {
  id: string;
  status: string;
  aiEnabled: boolean;
  title?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  customer: Customer;
  channel: ChannelRef;
  _count?: { messages: number };
}

export interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  origin: 'CUSTOMER' | 'AI' | 'SELLER' | 'SYSTEM';
  senderId?: string | null;
  content: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  variantId?: string | null;
  productId?: string | null;
  name: string;
  sku?: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderHistoryEntry {
  id: string;
  action: string;
  field?: string | null;
  from?: unknown;
  to?: unknown;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderCode: string;
  type: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  subtotal: string;
  shippingFee: string;
  discount: string;
  total: string;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  items: OrderItem[];
  holdings?: { id: string; status: string; quantity: number }[];
  history?: OrderHistoryEntry[];
}

export interface InventoryItem {
  variantId: string;
  onHand: number;
  onHold: number;
  stockedOut: number;
  sellable: number;
  lowStockAlert: number;
  variant: ProductVariant;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string | null;
  name: string;
  price: number;
  optionValues?: { option: string; value: string }[];
  inventory?: InventoryItem | null;
}

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  active: boolean;
  status: string;
  hasVariants: boolean;
  createdAt: string;
  variants?: ProductVariant[];
  media?: { id: string; url: string; type: string }[];
}
