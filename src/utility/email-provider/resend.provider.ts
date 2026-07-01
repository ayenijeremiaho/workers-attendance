import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IEmailProvider, SendMailOptions } from './email-provider.interface';

export class ResendProvider implements IEmailProvider {
  readonly providerName = 'resend';
  private readonly client: Resend;

  constructor(private readonly config: ConfigService) {
    this.client = new Resend(config.get<string>('RESEND_API_KEY'));
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const to = Array.isArray(options.to) ? options.to : [options.to];
    let cc: string[] | undefined;
    if (options.cc) {
      cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    }

    const { error } = await this.client.emails.send({
      from: options.from,
      to,
      cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
      })),
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
