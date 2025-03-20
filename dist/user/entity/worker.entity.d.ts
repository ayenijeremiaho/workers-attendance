import { UserType } from '../enums/user-type';
import { User } from './user.entity';
import { Department } from '../../department/entity/department.entity';
export declare class Worker extends User {
    department: Department;
    getType(): UserType;
}
