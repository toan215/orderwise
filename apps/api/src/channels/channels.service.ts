import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Adapter interface every channel (Messenger/Zalo/Web) implements. */
export interface ChannelAdapter {
  type: 'FACEBOOK_MESSENGER' | 'ZALO_OA' | 'WEB_CHAT';
  send(providerMessage: ProviderOutbound): Promise<ProviderResult>;
  parseWebhook?(raw: unknown): ParsedInbound[] | null;
}

export interface ProviderOutbound {
  channelConfig: Record<string, any>; // access token, page/oa id...
  recipientId: string; // customer PSID / zalo id
  content: string;
}

export interface ProviderResult {
  ok: boolean;
  providerMsgId?: string;
  error?: string;
}

export interface ParsedInbound {
  customerId: string;
  customerName?: string;
  content: string;
  providerMsgId?: string;
}

@Injectable()
export class ChannelsService {
  private adapters = new Map<string, ChannelAdapter>();

  register(adapter: ChannelAdapter) {
    this.adapters.set(adapter.type, adapter);
  }

  get(type: string): ChannelAdapter | undefined {
    return this.adapters.get(type);
  }
}
