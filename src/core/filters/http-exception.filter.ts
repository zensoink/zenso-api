import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    this.logger.error(
      `[HTTP ${status}] ${request.method} ${request.url} — ${typeof exceptionResponse === 'object' ? JSON.stringify(exceptionResponse) : exceptionResponse}`
    );

    response.status(status).json({
      statusCode: status,
      message: this.extractMessage(exceptionResponse),
      timestamp: new Date().toISOString(),
    });
  }

  private extractMessage(exceptionResponse: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (!exceptionResponse || typeof exceptionResponse !== 'object') {
      return 'An error occurred';
    }

    if (!('message' in exceptionResponse)) {
      return 'An error occurred';
    }

    const raw: unknown = exceptionResponse.message;

    if (Array.isArray(raw)) {
      return raw.join('; ');
    }

    if (typeof raw === 'string') {
      return raw;
    }

    return 'An error occurred';
  }
}
