import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BirthdayWish} from './entity/birthday-wish.entity';
import {BirthdayService} from './service/birthday.service';
import {BirthdayController} from './controller/birthday.controller';
import {MemberModule} from '../member/member.module';
import {AnnouncementModule} from '../announcement/announcement.module';
import {UtilityModule} from '../utility/utility.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([BirthdayWish]),
        MemberModule,
        AnnouncementModule,
        UtilityModule,
    ],
    providers: [BirthdayService],
    controllers: [BirthdayController],
})
export class BirthdayModule {
}
