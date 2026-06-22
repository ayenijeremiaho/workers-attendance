import {SetMetadata} from '@nestjs/common';

export const MODULE_KEY = 'module_key';
export const RequiresModule = (key: string) => SetMetadata(MODULE_KEY, key);
