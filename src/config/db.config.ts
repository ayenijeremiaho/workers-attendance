import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as process from 'node:process';
import * as path from 'node:path';

export default (): PostgresConnectionOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +process.env.DARTABASE_PORT,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.resolve(__dirname, '..') + '/**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: true,
});
