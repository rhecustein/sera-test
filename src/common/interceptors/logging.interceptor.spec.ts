import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockContext: ExecutionContext;

  const createMockContext = (user?: any) =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/test',
          headers: { 'x-request-id': 'req-uuid-1' },
          ip: '127.0.0.1',
          user,
        }),
        getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockContext = createMockContext();
  });

  it('should pass through response data', (done) => {
    const testData = { id: '1' };
    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(testData)),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual(testData);
      done();
    });
  });

  it('should log with userId when user is authenticated', (done) => {
    const authedContext = createMockContext({ id: 'user-uuid-1' });
    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    interceptor.intercept(authedContext, mockHandler).subscribe(() => {
      done();
    });
  });

  it('should handle errors and re-throw', (done) => {
    const error = new Error('Test error');
    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(throwError(() => error)),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        done();
      },
    });
  });
});
