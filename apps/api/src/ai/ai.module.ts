import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProviderFactory } from './llm/llm.factory';
import { EmbeddingProviderFactory } from './embedding/embedding.factory';
import { RagService } from './rag/rag.service';
import { IntentResolver } from './intent/intent.resolver';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiWorkers } from './workers/ai.workers';
import { InventoryModule } from '../inventory/inventory.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChannelsModule } from '../channels/channels.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaService } from '../prisma/prisma.service';
import type { LlmProvider } from './llm/llm.types';
import type { EmbeddingProvider } from './embedding/embedding.types';
import { LLM_PROVIDER, EMBEDDING_PROVIDER } from './ai.tokens';

export { LLM_PROVIDER, EMBEDDING_PROVIDER } from './ai.tokens';

const llmProvider: Provider = {
  provide: LLM_PROVIDER,
  inject: [LlmProviderFactory],
  useFactory: (f: LlmProviderFactory): LlmProvider => f.create(),
};
const embeddingProvider: Provider = {
  provide: EMBEDDING_PROVIDER,
  inject: [EmbeddingProviderFactory],
  useFactory: (f: EmbeddingProviderFactory): EmbeddingProvider => f.create(),
};

/**
 * AI intake: RAG + intent pipeline + BullMQ workers. Exposes AiService and
 * RagService for the rest of the app (web-chat / channel workers reuse them).
 */
@Module({
  imports: [InventoryModule, OrdersModule, ConversationsModule, ChannelsModule],
  controllers: [AiController],
  providers: [
    LlmProviderFactory,
    EmbeddingProviderFactory,
    llmProvider,
    embeddingProvider,
    RagService,
    IntentResolver,
    AiService,
    {
      provide: AiWorkers,
      inject: [ConfigService, PrismaService, RagService],
      useFactory: (config: ConfigService, prisma: PrismaService, rag: RagService) =>
        new AiWorkers(config, prisma, (vid: string) => rag.indexVariant(vid)),
    },
  ],
  exports: [AiService, RagService, IntentResolver, AiWorkers],
})
export class AiModule {}
