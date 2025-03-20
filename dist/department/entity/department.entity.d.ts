import { Worker } from '../../user/entity/worker.entity';
export declare class Department {
    id: string;
    name: string;
    description: string;
    workers: Worker[];
    createdAt: Date;
    updatedAt: Date;
}
