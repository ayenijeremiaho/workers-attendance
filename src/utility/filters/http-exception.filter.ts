import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger, PayloadTooLargeException} from '@nestjs/common';
import {Response} from 'express';

const MULTER_FILE_TOO_LARGE_MESSAGE = 'File too large';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : (exceptionResponse as any).message || exception.message;

            if (Array.isArray(message)) {
                message = message[0];
            }

            if (exception instanceof PayloadTooLargeException && message === MULTER_FILE_TOO_LARGE_MESSAGE) {
                const maxBytes = Number.parseInt(process.env.MAX_FILE_UPLOAD_BYTES ?? '', 10) || 5 * 1024 * 1024;
                const maxMb = Math.round(maxBytes / (1024 * 1024));
                message = `The uploaded file exceeds the maximum allowed size of ${maxMb} MB. Please upload a smaller file.`;
            }

            if (status >= 500) {
                this.logger.error(`[${status}] ${message}`, exception.stack);
            } else {
                this.logger.warn(`[${status}] ${message}`);
            }
        } else {
            const stack = exception instanceof Error ? exception.stack : JSON.stringify(exception);
            this.logger.error('Unhandled exception', stack);
        }

        response.status(status).json({
            data: null,
            status,
            message,
        });
    }
}
