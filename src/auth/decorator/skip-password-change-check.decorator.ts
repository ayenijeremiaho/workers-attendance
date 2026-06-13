import {SetMetadata} from '@nestjs/common';

export const SKIP_PASSWORD_CHANGE_CHECK = 'SKIP_PASSWORD_CHANGE_CHECK';
export const SkipPasswordChangeCheck = () => SetMetadata(SKIP_PASSWORD_CHANGE_CHECK, true);
