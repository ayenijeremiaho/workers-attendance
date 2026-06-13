import {Test, TestingModule} from '@nestjs/testing';
import {DataSource} from 'typeorm';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {CacheService} from './utility/service/cache.service';

const mockDataSource = {query: jest.fn().mockResolvedValue([])};
const mockCacheService = {ping: jest.fn().mockResolvedValue(undefined)};

describe('AppController', () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                AppService,
                {provide: DataSource, useValue: mockDataSource},
                {provide: CacheService, useValue: mockCacheService},
            ],
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe('root', () => {
        it('should return "Hello World!"', () => {
            expect(appController.getHello()).toBe('Hello World!');
        });
    });
});
