import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { EmailLog } from '../entity/email-log.entity';
import { IEmailProvider } from '../email-provider/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../email-provider/email-provider.token';

export interface EmailAttachment {
  filename: string;
  content: string;
  encoding: 'base64';
}

export interface EmailJobData {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

@Injectable()
@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly fromAddress: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: IEmailProvider,
  ) {
    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ??
      this.configService.get<string>('EMAIL_USER');
  }

  @Process('send')
  async handleSend(job: Job<EmailJobData>): Promise<void> {
    const { to, cc, subject, html, attachments } = job.data;
    await this.emailProvider.sendMail({
      from: this.fromAddress,
      to,
      cc,
      subject,
      html,
      attachments,
    });
    this.logger.debug(
      `Email sent: "${subject}" to ${Array.isArray(to) ? to.join(', ') : to} (attempt ${job.attemptsMade + 1})`,
    );
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<EmailJobData>): Promise<void> {
    const { to, subject } = job.data;
    const recipient = Array.isArray(to) ? to.join(', ') : to;
    await this.emailLogRepository.save(
      this.emailLogRepository.create({
        recipient,
        subject,
        status: 'sent',
        jobId: String(job.id),
        provider: this.emailProvider.providerName,
        attemptsMade: job.attemptsMade,
      }),
    );
  }

  @OnQueueFailed()
  async onFailed(job: Job<EmailJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return; // transient failure — Bull will retry

    const { to, subject } = job.data;
    const recipient = Array.isArray(to) ? to.join(', ') : to;
    this.logger.error(
      `Email permanently failed after ${job.attemptsMade} attempts: "${subject}" to ${recipient} — ${error.message}`,
    );
    await this.emailLogRepository.save(
      this.emailLogRepository.create({
        recipient,
        subject,
        status: 'failed',
        jobId: String(job.id),
        provider: this.emailProvider.providerName,
        errorMessage: error.message,
        attemptsMade: job.attemptsMade,
      }),
    );
  }
}
