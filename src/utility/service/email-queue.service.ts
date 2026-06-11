import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Email queue service for reliable email delivery.
 * Uses an in-memory queue with periodic processing.
 * 
 * Features:
 * - Queue-based email processing
 * - Automatic retry on failure
 * - Configurable retry count and delay
 * - Logging of all email operations
 * 
 * For production, consider replacing with Bull + Redis for:
 * - Persistent queue (survives restarts)
 * - Distributed processing
 * - Better scalability
 */
interface QueuedEmail {
  id: string;
  to: string | [string];
  cc?: string | [string];
  subject: string;
  html: string;
  retryCount: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly queue: QueuedEmail[] = [];
  private processing = false;
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 5000; // 5 seconds
  private readonly processIntervalMs = 1000; // 1 second
  private processingInterval: NodeJS.Timeout | null = null;
  private mailTransport: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize the service
   */
  async onModuleInit(): Promise<void> {
    this.mailTransport = this.createTransport();
    this.startProcessing();
    this.logger.log('Email queue service initialized');
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.stopProcessing();
    this.logger.log(`Email queue service destroyed. ${this.queue.length} emails pending.`);
  }

  /**
   * Add an email to the queue
   */
  async queueEmail(
    to: string | [string],
    subject: string,
    html: string,
    cc?: string | [string],
  ): Promise<string> {
    const email: QueuedEmail = {
      id: this.generateId(),
      to,
      cc,
      subject,
      html,
      retryCount: 0,
      createdAt: new Date(),
    };
    
    this.queue.push(email);
    this.logger.debug(`Email queued: ${subject} to ${to}`);
    
    return email.id;
  }

  /**
   * Add an email with template to the queue
   */
  async queueEmailWithTemplate(
    to: string | [string],
    subject: string,
    templateName: string,
    templateData: Record<string, any>,
    cc?: string | [string],
  ): Promise<string> {
    const templatePath = path.resolve(
      __dirname,
      '..',
      'templates',
      `${templateName}.html`,
    );
    
    try {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const compiledTemplate = this.compileTemplate(template, templateData);
      return this.queueEmail(to, subject, compiledTemplate, cc);
    } catch (error) {
      this.logger.error(`Failed to read template ${templateName}: ${error}`);
      throw error;
    }
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get statistics about the queue
   */
  getStats(): {
    total: number;
    pending: number;
    failed: number;
    oldestEmailAgeMs?: number;
  } {
    const now = new Date();
    const pending = this.queue.length;
    const failed = this.queue.filter(e => e.error).length;
    
    const oldest = this.queue[0];
    const oldestEmailAgeMs = oldest 
      ? now.getTime() - oldest.createdAt.getTime()
      : undefined;
    
    return {
      total: pending + failed,
      pending,
      failed,
      oldestEmailAgeMs,
    };
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return; // Already processing
    }
    
    this.processingInterval = setInterval(
      () => this.processQueue(),
      this.processIntervalMs,
    );
    
    // Also process immediately
    this.processQueue();
  }

  /**
   * Stop processing the queue
   */
  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }
    
    this.processing = true;
    
    try {
      while (this.queue.length > 0) {
        const email = this.queue[0];
        
        try {
          await this.sendEmail(email);
          this.queue.shift();
          this.logger.debug(`Email sent: ${email.subject} to ${email.to}`);
        } catch (error) {
          this.logger.error(`Failed to send email: ${email.subject} to ${email.to}: ${error}`);
          
          email.lastAttemptAt = new Date();
          email.error = error instanceof Error ? error.message : String(error);
          email.retryCount++;
          
          if (email.retryCount >= this.maxRetries) {
            this.queue.shift();
            this.logger.error(`Email failed after ${this.maxRetries} attempts: ${email.subject}`);
          } else {
            // Move to end of queue for retry
            this.queue.push(this.queue.shift()!);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Send a single email
   */
  private async sendEmail(email: QueuedEmail): Promise<void> {
    if (!this.mailTransport) {
      this.mailTransport = this.createTransport();
    }
    
    const mailOptions: Mail.Options = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      html: email.html,
    };
    
    await this.mailTransport.sendMail(mailOptions);
  }

  /**
   * Create the mail transport
   */
  private createTransport(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE'),
      service: this.configService.get<string>('EMAIL_SERVICE'),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  /**
   * Compile a template with data
   */
  private compileTemplate(template: string, data: Record<string, any>): string {
    return Object.keys(data).reduce((compiled, key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      return compiled.replace(regex, data[key]);
    }, template);
  }

  /**
   * Generate a unique ID for emails
   */
  private generateId(): string {
    return `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
