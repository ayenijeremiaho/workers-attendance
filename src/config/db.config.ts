import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as process from 'node:process';
import * as path from 'node:path';
import {SnakeNamingStrategy} from '../utility/snake-naming.strategy';

const dbConfig = (): PostgresConnectionOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl:
        process.env.DATABASE_SSL === 'true' ? {rejectUnauthorized: false} : false,
    entities: [path.resolve(__dirname, '..') + '/**/*.entity{.ts,.js}'],
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
    logging: process.env.DATABASE_LOGGING === 'true',
    migrations: [path.resolve(__dirname, '..') + '/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    // Connection pooling configuration optimized for 200+ concurrent workers
    // Calculated pool size: ceil(200 concurrent users * 0.2) + 10 buffer = 50 connections
    poolSize: process.env.DATABASE_POOL_SIZE ? +process.env.DATABASE_POOL_SIZE : 50,
    extra: {
        // PostgreSQL connection pool settings (pg library)
        // max connections = poolSize from TypeORM
        max: process.env.DATABASE_POOL_SIZE ? +process.env.DATABASE_POOL_SIZE : 50,
        min: process.env.DATABASE_POOL_MIN ? +process.env.DATABASE_POOL_MIN : 10,
        // Idle connections are closed after 30 seconds to free resources
        idleTimeoutMillis: 30000,
        // Connection establishment timeout - fail fast if DB is down
        connectionTimeoutMillis: 2000,
        // Maximum time to wait for a connection from the pool (prevents hanging)
        poolTimeoutMillis: 5000,
        // Reap idle clients every 10 seconds to maintain optimal pool size
        reapIntervalMillis: 10000,
        // Log pool statistics in development
        log: process.env.DATABASE_POOL_LOG === 'true',
        // Use transaction pooling for better performance with TypeORM
        pool_mode: process.env.DATABASE_POOL || 'transaction',
        // Application name for PostgreSQL monitoring
        application_name: process.env.APP_NAME || 'discovery-hub-api',
        // Enable query logging in development for debugging
        ...(process.env.NODE_ENV === 'development' && {
            debug: process.env.DATABASE_DEBUG === 'true',
        }),
    },
});

export default dbConfig;
