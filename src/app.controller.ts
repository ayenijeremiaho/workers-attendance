import {Controller, Get, Res, ServiceUnavailableException, Version, VERSION_NEUTRAL} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import {AppService} from './app.service';
import {DataSource} from 'typeorm';
import {CacheService} from './utility/service/cache.service';
import {Public} from './auth/decorator/public.decorator';
import {Response} from 'express';

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly dataSource: DataSource,
        private readonly cacheService: CacheService,
    ) {}

    @Public()
    @SkipThrottle()
    @Version(VERSION_NEUTRAL)
    @Get()
    getHello(@Res() res: Response): void {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(this.appService.getWelcomePage());
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
