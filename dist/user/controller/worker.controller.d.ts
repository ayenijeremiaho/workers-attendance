import { CreateWorkerDto } from '../dto/create-worker.dto';
import { WorkerService } from '../service/worker.service';
import { WorkerDto } from '../dto/worker.dto';
import { UpdateWorkerDto } from '../dto/update-worker.dto';
export declare class WorkerController {
    private readonly workerService;
    constructor(workerService: WorkerService);
    create(createWorkerDto: CreateWorkerDto): Promise<WorkerDto>;
    update(id: string, updateWorkerDto: UpdateWorkerDto): Promise<WorkerDto>;
    get(id: string): Promise<WorkerDto>;
    resetPassword(id: string): Promise<string>;
}
