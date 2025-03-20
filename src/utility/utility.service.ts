import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UtilityService {
  private readonly logger = new Logger(UtilityService.name);

  constructor(private readonly configService: ConfigService) {}

  public async hashValue(value: string): Promise<string> {
    return await argon2.hash(value);
  }

  public async verifyHashedValue(
    value: string,
    hashedValue: string,
  ): Promise<boolean> {
    return await argon2.verify(hashedValue, value);
  }

  public sendEmail(to: string | [string], subject: string, body: string) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject,
      html: body,
    };

    this.getMailTransport()
      .sendMail(mailOptions)
      .then(() => {
        this.logger.log(`SENT ${subject} EMAIL TO ${to}`);
      })
      .catch((error) => {
        this.logger.error(`ERROR SENDING ${subject} EMAIL TO ${to}`, error);
      });
  }

  private getMailTransport() {
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
}
