import {Injectable, Logger} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {AttendanceService} from '../service/attendance.service';
import {CacheService} from '../../utility/service/cache.service';

const LOCK_KEY = 'lock:absence-marking';
const LOCK_TTL_SECONDS = 270;

@Injectable()
export class AttendanceJobService {
    private readonly logger = new Logger(AttendanceJobService.name);

    constructor(
        private readonly attendanceService: AttendanceService,
        private readonly cacheService: CacheService,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async scheduledMarkAbsentees(): Promise<void> {
        const acquired = await this.cacheService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
        if (!acquired) {
            this.logger.debug('Absence marking skipped — another instance holds the lock');
            return;
        }
        try {
            await this.attendanceService.markAbsentees();
        } finally {
            this.cacheService.releaseLock(LOCK_KEY);
        }
    }
}
