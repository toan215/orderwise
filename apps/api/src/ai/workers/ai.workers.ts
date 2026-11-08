import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_QUEUES } from '../ai.queues';

interface HoldTimeoutJob {
  orderId: string;
}

interface DeliveryRetryJob {
  messageId: string;
}
interface EmbeddingJob {
  variantId: string;
}

/**
 * BullMQ workers (raw bullmq — already a dependency; no @nestjs/bullmq needed):
 *  - HOLD_TIMEOUT: expire AWAITING_CUSTOMER_CONFIRM orders past their TTL and
 *    release their stock holds (anti-overselling guarantee).
 *  - DELIVERY_RETRY: retry outbound messages stuck in PENDING/FAILED.
 *  - EMBEDDING: (re)compute a variant embedding for RAG.
 * Workers mark jobs done/failed and are safe to run as a separate process.
 */
@Injectable()
export class AiWorkers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiWorkers.name);
  private readonly conn: ConnectionOptions;
  private readonly enabled: boolean;
  private workers: Worker[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly embedVariant: (variantId: string) => Promise<void>,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL', '');
    this.enabled = this.config.get<string>('AI_WORKERS', '1') === '1';
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.config.get<string>('REDIS_PORT', '6379'));
    this.conn = redisUrl ? { url: redisUrl } : { host, port };
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('AI workers disabled (AI_WORKERS=0)');
      return;
    }
    const opts: { connection: ConnectionOptions } = { connection: this.conn };
    await this.startHoldTimeout(opts);
    await this.startDeliveryRetry(opts);
    await this.startEmbedding(opts);
    this.logger.log('AI workers started');
  }

  private async startHoldTimeout(opts: { connection: ConnectionOptions }) {
    const w = new Worker<HoldTimeoutJob>(
      AI_QUEUES.HOLD_TIMEOUT,
      async (job) => {
        const { orderId } = job.data;
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { holdings: { where: { status: 'ACTIVE' } } },
        });
        if (!order || order.status !== 'AWAITING_CUSTOMER_CONFIRM') return { skipped: 'not awaiting' };
        if (order.orderTimeoutAt && order.orderTimeoutAt.getTime() > Date.now()) {
          // Not expired yet — delayed retry.
          await job.moveToDelayed(Date.now() + 60_000);
          return { retried: true };
        }
        // Expire: release each active hold back to sellable, then mark CANCELLED.
        await this.prisma.$transaction(async (tx) => {
          for (const h of order.holdings) {
            await tx.inventoryItem.update({ where: { id: h.inventoryId }, data: { onHold: { decrement: h.quantity } } });
            await tx.stockHolding.update({ where: { id: h.id }, data: { status: 'EXPIRED', releasedAt: new Date() } });
            await tx.stockMovement.create({
              data: { shopId: order.shopId, inventoryId: h.inventoryId, type: 'TIMEOUT_RELEASE', quantity: h.quantity, reason: 'ADJUSTMENT', refOrderId: order.id },
            });
          }
          await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', cancelReason: 'ORDER_TIMEOUT', cancelledAt: new Date() } });
        });
        this.logger.log(`Expired order ${order.orderCode} (${order.id}) and released its holds`);
        return { expired: true, holdings: order.holdings.length };
      },
      opts,
    );
    this.workers.push(w);
  }

  private async startDeliveryRetry(opts: { connection: ConnectionOptions }) {
    const w = new Worker<DeliveryRetryJob>(
      AI_QUEUES.DELIVERY_RETRY,
      async (job) => {
        const msg = await this.prisma.message.findUnique({ where: { id: job.data.messageId } });
        if (!msg) return { skipped: 'not found' };
        if (msg.providerMsgId) {
          await this.prisma.message.update({ where: { id: msg.id }, data: { deliveryStatus: 'SENT', sentAt: msg.sentAt ?? new Date() } });
          return { sent: true };
        }
        return { skipped: 'no provider id; channel worker handles retry' };
      },
      opts,
    );
    this.workers.push(w);
  }

  private async startEmbedding(opts: { connection: ConnectionOptions }) {
    const w = new Worker<EmbeddingJob>(
      AI_QUEUES.EMBEDDING,
      async (job) => {
        await this.embedVariant(job.data.variantId);
        return { embedded: job.data.variantId };
      },
      opts,
    );
    this.workers.push(w);
  }

  /** Schedule a hold-timeout check for an order TTL. */
  async scheduleHoldTimeout(orderId: string, ttlMs: number) {
    const q = new Queue(HoldTimeoutQueueName, { connection: this.conn });
    await q.add('expire', { orderId }, { delay: ttlMs, attempts: 1 });
    await q.close();
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close())).catch(() => undefined);
    this.logger.log('AI workers stopped');
  }
}

const HoldTimeoutQueueName = AI_QUEUES.HOLD_TIMEOUT;
