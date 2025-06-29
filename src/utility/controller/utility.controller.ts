import { Controller, Get } from '@nestjs/common';
import { UtilityService } from '../service/utility.service';

@Controller('utility')
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) {}

  // Add a new controller method
  @Get()
  async getHello(): Promise<string> {
    // this.utilityService.sendEmail(
    //   'ayenijeremiah@gmail.com',
    //   'Hello',
    //   'Hello, World!',
    // );

    const data = {
      login_url: 'http://jfnfjfn.com',
      username: 'kk',
      password: 'jnjn',
      name: 'Jeremiah A.',
      explainer_video_url: 'http://djndjnjd.com'
    };
    this.utilityService.sendEmailWithTemplate(
      'ayenijeremiah@gmail.com',
      'Welcome to RCCG DC Staff App',
      'welcome-worker',
      data,
    );

    return 'Hello, World!';
  }
}
