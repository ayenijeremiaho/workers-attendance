import {Module} from '@nestjs/common';
import {EnumsController} from './enums.controller';
import {AdminEnumsController} from './admin-enums.controller';

@Module({
    controllers: [EnumsController, AdminEnumsController],
})
export class EnumsModule {
}
