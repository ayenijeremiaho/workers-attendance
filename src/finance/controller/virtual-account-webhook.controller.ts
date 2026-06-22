import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { VirtualAccountService } from '../service/virtual-account.service';

@Controller('webhooks/virtual-account-credit')
export class VirtualAccountWebhookController {
  constructor(private readonly virtualAccountService: VirtualAccountService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleCredit(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') paystackSig?: string,
    @Headers('verif-hash') flutterwaveSig?: string,
  ): Promise<void> {
    const signature = paystackSig ?? flutterwaveSig ?? '';
    await this.virtualAccountService.handleWebhookCredit(
      req.rawBody!,
      signature,
    );
  }
}
