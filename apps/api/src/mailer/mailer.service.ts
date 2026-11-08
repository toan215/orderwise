import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  async send(to: string, subject: string, html: string): Promise<void> {
    // STUB — wire to a provider in production.
    console.log(`[mailer stub] to=${to} subject="${subject}"`);
  }
}
