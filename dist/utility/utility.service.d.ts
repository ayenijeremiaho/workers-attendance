import { ConfigService } from '@nestjs/config';
export declare class UtilityService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    hashValue(value: string): Promise<string>;
    verifyHashedValue(value: string, hashedValue: string): Promise<boolean>;
    sendEmail(to: string | [string], subject: string, body: string): void;
    private getMailTransport;
}
