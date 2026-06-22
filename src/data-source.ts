import { DataSource } from 'typeorm';
import * as process from 'node:process';
import * as path from 'node:path';
import { SnakeNamingStrategy } from './utility/snake-naming.strategy';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [path.resolve(__dirname) + '/**/*.entity{.ts,.js}'],
  migrations: [path.resolve(__dirname) + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});
