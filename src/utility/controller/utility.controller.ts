import { Controller, Get } from '@nestjs/common';
import { UtilityService } from '../service/utility.service';

@Controller('utility')
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) {}

  // Add a new controller method
  @Get()
  async getHello(): Promise<string> {
    this.utilityService.sendEmail(
      'ayenijeremiah@gmail.com',
      'Hello',
      'Hello, World!',
    );

    return 'Hello, World!';
  }
}
