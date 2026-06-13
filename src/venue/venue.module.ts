import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Venue} from './entity/venue.entity';
import {VenueService} from './service/venue.service';
import {VenueController} from './controller/venue.controller';
import {UtilityModule} from '../utility/utility.module';

@Module({
    imports: [TypeOrmModule.forFeature([Venue]), UtilityModule],
    controllers: [VenueController],
    providers: [VenueService],
    exports: [VenueService, TypeOrmModule],
})
export class VenueModule {
}
