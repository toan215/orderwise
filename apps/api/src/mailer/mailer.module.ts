import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

// Placeholder for transactional email (verification, password reset).
// Swap in a real provider (Resend / SES / nodemailer) without touching callers.
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}

