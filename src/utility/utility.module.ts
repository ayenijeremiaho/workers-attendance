import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bull';
import {UtilityService} from './service/utility.service';
import {DateService} from './service/date.service';
import {CacheService} from './service/cache.service';
import {SanitizationService} from './service/sanitization.service';
import {EmailQueueService} from './service/email-queue.service';
import {AuditLogService} from './service/audit-log.service';
import {AuditLog} from './entity/audit-log.entity';
import {EmailLog} from './entity/email-log.entity';
import {ConfigModule} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {UtilityController} from './controller/utility.controller';
import {AuditLogController} from './controller/audit-log.controller';
import {EmailProcessor} from './processor/email.processor';
import {CloudinaryService} from './service/cloudinary.service';
import {PdfService} from './service/pdf.service';
import {ExcelService} from './service/excel.service';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([AuditLog, EmailLog]),
        BullModule.registerQueue({name: 'email'}),
    ],
    providers: [UtilityService, DateService, CacheService, SanitizationService, EmailQueueService, AuditLogService, EmailProcessor, CloudinaryService, PdfService, ExcelService],
    controllers: [UtilityController, AuditLogController],
    exports: [UtilityService, DateService, CacheService, SanitizationService, EmailQueueService, AuditLogService, CloudinaryService, PdfService, ExcelService],
})
export class UtilityModule {
}
