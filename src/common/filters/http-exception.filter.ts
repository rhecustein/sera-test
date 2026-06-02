import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errors =
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as any).message)
        ? (exceptionResponse as any).message.map((msg: string) => ({
            message: msg,
          }))
        : undefined;

    const message =
      errors
        ? 'Validation failed'
        : typeof exceptionResponse === 'object' &&
            'message' in exceptionResponse
          ? (exceptionResponse as any).message
          : String(exceptionResponse);

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      requestId: request.headers['x-request-id'] || null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
