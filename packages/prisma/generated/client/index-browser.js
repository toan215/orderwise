
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  fullName: 'fullName',
  phone: 'phone',
  avatarUrl: 'avatarUrl',
  status: 'status',
  isSuperAdmin: 'isSuperAdmin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  tokenHash: 'tokenHash',
  userId: 'userId',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  tokenHash: 'tokenHash',
  userId: 'userId',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ShopScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  logoUrl: 'logoUrl',
  currency: 'currency',
  address: 'address',
  phone: 'phone',
  timezone: 'timezone',
  status: 'status',
  settings: 'settings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ShopMemberScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  userId: 'userId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.InvitationScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  email: 'email',
  role: 'role',
  tokenHash: 'tokenHash',
  invitedBy: 'invitedBy',
  status: 'status',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  name: 'name',
  sku: 'sku',
  description: 'description',
  active: 'active',
  status: 'status',
  hasVariants: 'hasVariants',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sku: 'sku',
  name: 'name',
  price: 'price',
  compareAtPrice: 'compareAtPrice',
  costPrice: 'costPrice',
  isDefault: 'isDefault',
  active: 'active',
  optionValues: 'optionValues',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductMediaScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  url: 'url',
  type: 'type',
  position: 'position',
  altText: 'altText'
};

exports.Prisma.PolicyScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  title: 'title',
  content: 'content',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FAQEntryScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  question: 'question',
  answer: 'answer',
  keywords: 'keywords',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChannelScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  type: 'type',
  name: 'name',
  providerId: 'providerId',
  accessTokenEnc: 'accessTokenEnc',
  secret: 'secret',
  status: 'status',
  config: 'config',
  lastError: 'lastError',
  lastSyncAt: 'lastSyncAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  displayName: 'displayName',
  avatarUrl: 'avatarUrl',
  identifiers: 'identifiers',
  phone: 'phone',
  email: 'email',
  address: 'address',
  note: 'note',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  channelId: 'channelId',
  customerId: 'customerId',
  status: 'status',
  aiEnabled: 'aiEnabled',
  assignedToId: 'assignedToId',
  title: 'title',
  summary: 'summary',
  lastMessageAt: 'lastMessageAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConvParticipantScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  userId: 'userId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  direction: 'direction',
  origin: 'origin',
  senderId: 'senderId',
  providerMsgId: 'providerMsgId',
  content: 'content',
  contentType: 'contentType',
  payload: 'payload',
  deliveryStatus: 'deliveryStatus',
  sentAt: 'sentAt',
  createdAt: 'createdAt'
};

exports.Prisma.IntentScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  status: 'status',
  payload: 'payload',
  extractedJson: 'extractedJson',
  missingFields: 'missingFields',
  error: 'error',
  policyFlags: 'policyFlags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RawOrderLineScalarFieldEnum = {
  id: 'id',
  intentId: 'intentId',
  description: 'description',
  quantity: 'quantity',
  unit: 'unit',
  rawIndex: 'rawIndex',
  createdAt: 'createdAt',
  variantId: 'variantId'
};

exports.Prisma.ResolvedOrderLineScalarFieldEnum = {
  id: 'id',
  intentId: 'intentId',
  variantId: 'variantId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  notes: 'notes'
};

exports.Prisma.IntentStepScalarFieldEnum = {
  id: 'id',
  intentId: 'intentId',
  kind: 'kind',
  toolName: 'toolName',
  input: 'input',
  output: 'output',
  aiMessageId: 'aiMessageId',
  completed: 'completed',
  createdAt: 'createdAt'
};

exports.Prisma.HandoffScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  reason: 'reason',
  requestedBy: 'requestedBy',
  assignedToId: 'assignedToId',
  status: 'status',
  summary: 'summary',
  createdAt: 'createdAt',
  resolvedAt: 'resolvedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  orderCode: 'orderCode',
  shopId: 'shopId',
  conversationId: 'conversationId',
  customerId: 'customerId',
  type: 'type',
  status: 'status',
  paymentStatus: 'paymentStatus',
  deliveryStatus: 'deliveryStatus',
  subtotal: 'subtotal',
  shippingFee: 'shippingFee',
  discount: 'discount',
  total: 'total',
  customerName: 'customerName',
  customerPhone: 'customerPhone',
  shippingAddress: 'shippingAddress',
  shippingNote: 'shippingNote',
  cancelReason: 'cancelReason',
  cancelNote: 'cancelNote',
  createdById: 'createdById',
  confirmedAt: 'confirmedAt',
  cancelledAt: 'cancelledAt',
  customerConfirmAt: 'customerConfirmAt',
  orderTimeoutAt: 'orderTimeoutAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  intentId: 'intentId'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  variantId: 'variantId',
  productId: 'productId',
  name: 'name',
  sku: 'sku',
  unitPrice: 'unitPrice',
  quantity: 'quantity',
  lineTotal: 'lineTotal',
  createdAt: 'createdAt'
};

exports.Prisma.OrderHistoryScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  actorId: 'actorId',
  field: 'field',
  from: 'from',
  to: 'to',
  note: 'note',
  action: 'action',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryItemScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  variantId: 'variantId',
  onHand: 'onHand',
  onHold: 'onHold',
  stockedOut: 'stockedOut',
  lowStockAlert: 'lowStockAlert',
  updatedAt: 'updatedAt'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  inventoryId: 'inventoryId',
  type: 'type',
  quantity: 'quantity',
  reason: 'reason',
  reasonNote: 'reasonNote',
  refOrderId: 'refOrderId',
  actorId: 'actorId',
  createdAt: 'createdAt'
};

exports.Prisma.StockHoldingScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  orderId: 'orderId',
  quantity: 'quantity',
  status: 'status',
  expiresAt: 'expiresAt',
  releasedAt: 'releasedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ProductEmbeddingScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  model: 'model',
  contentHash: 'contentHash',
  content: 'content',
  updatedAt: 'updatedAt'
};

exports.Prisma.VariantEmbeddingScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  model: 'model',
  contentHash: 'contentHash',
  content: 'content',
  updatedAt: 'updatedAt'
};

exports.Prisma.PolicyEmbeddingScalarFieldEnum = {
  id: 'id',
  policyId: 'policyId',
  model: 'model',
  contentHash: 'contentHash',
  content: 'content',
  updatedAt: 'updatedAt'
};

exports.Prisma.FAQEmbeddingScalarFieldEnum = {
  id: 'id',
  faqId: 'faqId',
  model: 'model',
  contentHash: 'contentHash',
  content: 'content',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmbeddingJobScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  state: 'state',
  error: 'error',
  attempts: 'attempts',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VariantEmbeddingJobScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  state: 'state',
  error: 'error',
  attempts: 'attempts',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  userId: 'userId',
  type: 'type',
  priority: 'priority',
  title: 'title',
  body: 'body',
  data: 'data',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  shopId: 'shopId',
  actorId: 'actorId',
  objectType: 'objectType',
  objectId: 'objectId',
  action: 'action',
  before: 'before',
  after: 'after',
  ip: 'ip',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
};

exports.ShopStatus = exports.$Enums.ShopStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.MemberRole = exports.$Enums.MemberRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  SELLER: 'SELLER',
  VIEWER: 'VIEWER'
};

exports.ProductStatus = exports.$Enums.ProductStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  OUT_OF_STOCK: 'OUT_OF_STOCK'
};

exports.ChannelType = exports.$Enums.ChannelType = {
  FACEBOOK_MESSENGER: 'FACEBOOK_MESSENGER',
  ZALO_OA: 'ZALO_OA',
  WEB_CHAT: 'WEB_CHAT'
};

exports.ChannelStatus = exports.$Enums.ChannelStatus = {
  PENDING: 'PENDING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
  DISCONNECTED: 'DISCONNECTED'
};

exports.ConversationStatus = exports.$Enums.ConversationStatus = {
  OPEN: 'OPEN',
  HANDED_OVER: 'HANDED_OVER',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED'
};

exports.MessageDirection = exports.$Enums.MessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND'
};

exports.MessageOrigin = exports.$Enums.MessageOrigin = {
  CUSTOMER: 'CUSTOMER',
  AI: 'AI',
  SELLER: 'SELLER',
  SYSTEM: 'SYSTEM'
};

exports.MessageDeliveryStatus = exports.$Enums.MessageDeliveryStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING'
};

exports.IntentStatus = exports.$Enums.IntentStatus = {
  NEEDS_INFO: 'NEEDS_INFO',
  READY: 'READY',
  OUT_OF_POLICY: 'OUT_OF_POLICY',
  HANDED_OVER: 'HANDED_OVER',
  COMPLETE: 'COMPLETE'
};

exports.OrderType = exports.$Enums.OrderType = {
  FROM_CONVERSATION: 'FROM_CONVERSATION',
  MANUAL: 'MANUAL'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  DRAFT: 'DRAFT',
  AWAITING_CUSTOMER_CONFIRM: 'AWAITING_CUSTOMER_CONFIRM',
  AWAITING_SELLER_CONFIRM: 'AWAITING_SELLER_CONFIRM',
  CONFIRMED: 'CONFIRMED',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED'
};

exports.DeliveryStatus = exports.$Enums.DeliveryStatus = {
  NOT_SHIPPED: 'NOT_SHIPPED',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED'
};

exports.CancelReason = exports.$Enums.CancelReason = {
  CUSTOMER_CANCELLED: 'CUSTOMER_CANCELLED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRICE_CHANGED: 'PRICE_CHANGED',
  SELLER_CANCELLED: 'SELLER_CANCELLED',
  ORDER_TIMEOUT: 'ORDER_TIMEOUT',
  OTHER: 'OTHER'
};

exports.StockChangeType = exports.$Enums.StockChangeType = {
  INITIAL: 'INITIAL',
  PURCHASE_ADD: 'PURCHASE_ADD',
  SELL_IN: 'SELL_IN',
  ADJUSTMENT: 'ADJUSTMENT',
  ORDER_HOLD: 'ORDER_HOLD',
  ORDER_RELEASE: 'ORDER_RELEASE',
  ORDER_CONVERT: 'ORDER_CONVERT',
  TIMEOUT_RELEASE: 'TIMEOUT_RELEASE',
  CANCEL_RELEASE: 'CANCEL_RELEASE'
};

exports.MovementSourceType = exports.$Enums.MovementSourceType = {
  STORE_SALE: 'STORE_SALE',
  STOCK_IN: 'STOCK_IN',
  ADJUSTMENT: 'ADJUSTMENT'
};

exports.StockHoldingStatus = exports.$Enums.StockHoldingStatus = {
  ACTIVE: 'ACTIVE',
  RELEASED: 'RELEASED',
  CONVERTED: 'CONVERTED',
  EXPIRED: 'EXPIRED'
};

exports.NotifType = exports.$Enums.NotifType = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  NEW_ORDER: 'NEW_ORDER',
  LOW_STOCK: 'LOW_STOCK',
  CHANNEL_ERROR: 'CHANNEL_ERROR',
  AI_HANDOFF: 'AI_HANDOFF',
  SYSTEM: 'SYSTEM'
};

exports.NotifPriority = exports.$Enums.NotifPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH'
};

exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  PasswordResetToken: 'PasswordResetToken',
  Shop: 'Shop',
  ShopMember: 'ShopMember',
  Invitation: 'Invitation',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  ProductMedia: 'ProductMedia',
  Policy: 'Policy',
  FAQEntry: 'FAQEntry',
  Channel: 'Channel',
  Customer: 'Customer',
  Conversation: 'Conversation',
  ConvParticipant: 'ConvParticipant',
  Message: 'Message',
  Intent: 'Intent',
  RawOrderLine: 'RawOrderLine',
  ResolvedOrderLine: 'ResolvedOrderLine',
  IntentStep: 'IntentStep',
  Handoff: 'Handoff',
  Order: 'Order',
  OrderItem: 'OrderItem',
  OrderHistory: 'OrderHistory',
  InventoryItem: 'InventoryItem',
  StockMovement: 'StockMovement',
  StockHolding: 'StockHolding',
  ProductEmbedding: 'ProductEmbedding',
  VariantEmbedding: 'VariantEmbedding',
  PolicyEmbedding: 'PolicyEmbedding',
  FAQEmbedding: 'FAQEmbedding',
  EmbeddingJob: 'EmbeddingJob',
  VariantEmbeddingJob: 'VariantEmbeddingJob',
  Notification: 'Notification',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
