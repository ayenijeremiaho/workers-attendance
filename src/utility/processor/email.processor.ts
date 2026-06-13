import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {OnQueueCompleted, OnQueueFailed, Process, Processor} from '@nestjs/bull';
import {Job} from 'bull';
import {ConfigService} from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import {EmailLog} from '../entity/email-log.entity';

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
    private readonly mailTransport: nodemailer.Transporter;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(EmailLog)
        private readonly emailLogRepository: Repository<EmailLog>,
    ) {
        this.mailTransport = nodemailer.createTransport({
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

    @Process('send')
    async handleSend(job: Job<EmailJobData>): Promise<void> {
        const {to, cc, subject, html, attachments} = job.data;
        const mailOptions: Mail.Options = {
            from: this.configService.get<string>('EMAIL_USER'),
            to,
            cc,
            subject,
            html,
            attachments,
        };
        await this.mailTransport.sendMail(mailOptions);
        this.logger.debug(`Email sent: "${subject}" to ${Array.isArray(to) ? to.join(', ') : to} (attempt ${job.attemptsMade + 1})`);
    }

    @OnQueueCompleted()
    async onCompleted(job: Job<EmailJobData>): Promise<void> {
        const {to, subject} = job.data;
        const recipient = Array.isArray(to) ? to.join(', ') : to;
        await this.emailLogRepository.save(
            this.emailLogRepository.create({
                recipient,
                subject,
                status: 'sent',
                jobId: String(job.id),
                attemptsMade: job.attemptsMade,
            }),
        );
    }

    @OnQueueFailed()
    async onFailed(job: Job<EmailJobData>, error: Error): Promise<void> {
        const maxAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade < maxAttempts) return; // transient failure — Bull will retry

        const {to, subject} = job.data;
        const recipient = Array.isArray(to) ? to.join(', ') : to;
        this.logger.error(`Email permanently failed after ${job.attemptsMade} attempts: "${subject}" to ${recipient} — ${error.message}`);
        await this.emailLogRepository.save(
            this.emailLogRepository.create({
                recipient,
                subject,
                status: 'failed',
                jobId: String(job.id),
                errorMessage: error.message,
                attemptsMade: job.attemptsMade,
            }),
        );
    }
}
