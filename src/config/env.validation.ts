import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    CORS_ORIGINS: Joi.string().required(),

    DATABASE_HOST: Joi.string().required(),
    DATABASE_PORT: Joi.number().default(5432),
    DATABASE_USER: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_NAME: Joi.string().required(),
    DATABASE_SSL: Joi.boolean().default(false),

    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRY_IN: Joi.string().default('1h'),
    REFRESH_JWT_SECRET: Joi.string().min(32).required(),
    REFRESH_JWT_EXPIRY_IN: Joi.string().default('7d'),

    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),
    REDIS_DB: Joi.number().default(0),

    EMAIL_HOST: Joi.string().required(),
    EMAIL_PORT: Joi.number().required(),
    EMAIL_SECURE: Joi.boolean().default(false),
    EMAIL_USER: Joi.string().required(),
    EMAIL_PASSWORD: Joi.string().required(),

    LOGIN_URL: Joi.string().uri().required(),
    ADMIN_LOGIN_URL: Joi.string().uri().required(),

    THROTTLE_TTL_MS: Joi.number().default(60_000),
    THROTTLE_LIMIT: Joi.number().default(100),

    LOGIN_MAX_ATTEMPTS: Joi.number().default(5),
    LOGIN_WINDOW_SECONDS: Joi.number().default(900),

    DEVICE_RESET_MAX_ATTEMPTS: Joi.number().default(3),
    DEVICE_RESET_WINDOW_SECONDS: Joi.number().default(86400),

    PRODUCT_NAME: Joi.string().default('Discovery Hub'),
    CHURCH_NAME: Joi.string().default('RCCG Discovery Centre'),
    CHURCH_ADDRESS: Joi.string().default('62 Igi Olugbin Street, Bariga. Lagos, Nigeria'),
    DEFAULT_VENUE_NAME: Joi.string().default('RCCG Discovery Centre'),
}).options({allowUnknown: true});
