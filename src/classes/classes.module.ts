import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ChurchClass} from './entity/church-class.entity';
import {ClassEnrollment} from './entity/class-enrollment.entity';
import {ClassesService} from './service/classes.service';
import {ClassesController} from './controller/classes.controller';
import {MemberModule} from '../member/member.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChurchClass, ClassEnrollment]),
        MemberModule,
    ],
    providers: [ClassesService],
    controllers: [ClassesController],
    exports: [TypeOrmModule, ClassesService],
})
export class ClassesModule {
}
