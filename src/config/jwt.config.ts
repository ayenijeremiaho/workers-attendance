import { JwtModuleOptions } from '@nestjs/jwt';
import * as process from 'node:process';
import { registerAs } from '@nestjs/config';

export default registerAs(
  'jwt-config',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: process.env.JWT_EXPIRY_IN },
  }),
);
