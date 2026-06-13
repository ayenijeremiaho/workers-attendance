import {Injectable, Logger} from '@nestjs/common';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as Handlebars from 'handlebars';
import {EmailJobData} from '../processor/email.processor';

@Injectable()
export class EmailQueueService {
    private readonly logger = new Logger(EmailQueueService.name);

    constructor(
        @InjectQueue('email') private readonly emailQueue: Queue<EmailJobData>,
    ) {}

    async queueEmail(
        to: string | string[],
        subject: string,
        html: string,
        cc?: string | string[],
    ): Promise<string> {
        const job = await this.emailQueue.add('send', {to, cc, subject, html}, {
            attempts: 5,
            backoff: {type: 'fixed', delay: 5000},
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.debug(`Email queued: "${subject}" to ${Array.isArray(to) ? to.join(', ') : to} (job ${job.id})`);
        return String(job.id);
    }

    async queueEmailWithTemplate(
        to: string | string[],
        subject: string,
        templateName: string,
        templateData: Record<string, any>,
        cc?: string | string[],
    ): Promise<string> {
        const templatePath = path.resolve(
            __dirname,
            '..',
            'templates',
            `${templateName}.html`,
        );
        try {
            const template = fs.readFileSync(templatePath, 'utf-8');
            const html = this.compileTemplate(template, templateData);
            return this.queueEmail(to, subject, html, cc);
        } catch (error) {
            this.logger.error(`Failed to read template ${templateName}: ${error}`);
            throw error;
        }
    }

    async getQueueSize(): Promise<number> {
        return this.emailQueue.count();
    }

    async getStats(): Promise<{waiting: number; active: number; completed: number; failed: number; delayed: number}> {
        return this.emailQueue.getJobCounts();
    }

    private compileTemplate(template: string, data: Record<string, any>): string {
        return Handlebars.compile(template)(data);
    }
}
