import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse !== null && typeof exceptionResponse === 'object') {
      if ('message' in exceptionResponse) {
        const raw = exceptionResponse.message;
        if (Array.isArray(raw)) {
          message = raw.join('; ');
        } else if (typeof raw === 'string') {
          message = raw;
        } else {
          message = 'An error occurred';
        }
      } else {
        message = 'An error occurred';
      }
    } else {
      message = 'An error occurred';
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
