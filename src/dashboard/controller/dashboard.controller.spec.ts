import {Test, TestingModule} from '@nestjs/testing';
import {DashboardController} from './dashboard.controller';
import {DashboardService} from '../service/dashboard.service';
import {AdminGuard} from '../../admin/guard/admin.guard';

describe('DashboardController', () => {
    let controller: DashboardController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DashboardController],
            providers: [{provide: DashboardService, useValue: {}}],
        })
            .overrideGuard(AdminGuard)
            .useValue({canActivate: () => true})
            .compile();

        controller = module.get<DashboardController>(DashboardController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
