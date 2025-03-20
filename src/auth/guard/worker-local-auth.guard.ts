import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WorkerLocalAuthGuard extends AuthGuard('worker-local') {}
