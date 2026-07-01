export interface SendMailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string; encoding: 'base64' }[];
}

export interface IEmailProvider {
  readonly providerName: string;
  sendMail(options: SendMailOptions): Promise<void>;
}
