import {Test, TestingModule} from '@nestjs/testing';
import {EventController} from './event.controller';
import {EventService} from '../service/event.service';
import {AdminGuard} from '../../admin/guard/admin.guard';

describe('EventController', () => {
    let controller: EventController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventController],
            providers: [{provide: EventService, useValue: {}}],
        })
            .overrideGuard(AdminGuard)
            .useValue({canActivate: () => true})
            .compile();

        controller = module.get<EventController>(EventController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
