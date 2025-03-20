import { UtilityService } from './utility.service';
export declare class UtilityController {
    private readonly utilityService;
    constructor(utilityService: UtilityService);
    getHello(): Promise<string>;
}
