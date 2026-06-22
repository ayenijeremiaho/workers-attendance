import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getWelcomePage(): string {
    const template = fs.readFileSync(
      path.resolve(__dirname, 'utility', 'templates', 'welcome-page.html'),
      'utf-8',
    );
    return Handlebars.compile(template)({
      product_name: this.config.get<string>('PRODUCT_NAME'),
      church_name: this.config.get<string>('CHURCH_NAME'),
      church_address: this.config.get<string>('CHURCH_ADDRESS'),
      postman_url: this.config.get<string>('POSTMAN_URL'),
    });
  }
}
