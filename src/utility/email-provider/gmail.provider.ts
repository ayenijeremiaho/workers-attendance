import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailProvider, SendMailOptions } from './email-provider.interface';

export class GmailProvider implements IEmailProvider {
  readonly providerName = 'gmail';
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('EMAIL_HOST'),
      port: config.get<number>('EMAIL_PORT'),
      secure: config.get<boolean>('EMAIL_SECURE'),
      service: config.get<string>('EMAIL_SERVICE'),
      auth: {
        user: config.get<string>('EMAIL_USER'),
        pass: config.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: options.from,
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  }
}
