import {Controller, Get, ServiceUnavailableException} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import {AppService} from './app.service';
import {DataSource} from 'typeorm';
import {CacheService} from './utility/service/cache.service';
import {Public} from './auth/decorator/public.decorator';

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly dataSource: DataSource,
        private readonly cacheService: CacheService,
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Public()
    @SkipThrottle()
    @Get('health')
    async health(): Promise<{ status: string; uptime: number }> {
        const errors: string[] = [];

        await this.dataSource.query('SELECT 1').catch(() => errors.push('database'));
        await this.cacheService.ping().catch(() => errors.push('redis'));

        if (errors.length) {
            throw new ServiceUnavailableException(`Unhealthy: ${errors.join(', ')} unreachable`);
        }

        return {status: 'ok', uptime: Math.floor(process.uptime())};
    }
}
