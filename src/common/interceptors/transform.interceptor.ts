import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface TransformedResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, TransformedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<TransformedResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((payload) => {
        const statusCode = response.statusCode;

        if (payload && payload.__transformed) return payload;
        if (typeof payload === 'string') return payload;

        // Controllers return { message?, data?, meta? } or raw data
        const message = payload?.message;
        const meta = payload?.meta;
        // If controller returns { message, data }, extract inner data
        const data = message && payload?.data !== undefined
          ? payload.data
          : payload;

        return {
          success: true,
          statusCode,
          message: message || this.getDefaultMessage(statusCode),
          data,
          ...(meta && { meta }),
        };
      }),
    );
  }

  private getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      200: 'Success',
      201: 'Created successfully',
      204: 'Deleted successfully',
    };
    return messages[statusCode] || 'Success';
  }
}
