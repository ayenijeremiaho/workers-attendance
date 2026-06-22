import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorator/requires-module.decorator';
import { ChurchSettingsService } from '../service/church-settings.service';

@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly churchSettingsService: ChurchSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleKey) return true;
    const enabled = await this.churchSettingsService.isEnabled(moduleKey);
    if (!enabled)
      throw new ForbiddenException('This module is currently disabled.');
    return true;
  }
}
