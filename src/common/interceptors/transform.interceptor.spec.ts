import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  });

  it('should wrap data in success response', (done) => {
    const testData = { id: '1', name: 'Test' };
    mockCallHandler = { handle: jest.fn().mockReturnValue(of(testData)) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      done();
    });
  });

  it('should include meta when provided', (done) => {
    const testData = {
      meta: { page: 1, total: 10 },
      message: 'Success',
      data: [1, 2, 3],
    };
    mockCallHandler = { handle: jest.fn().mockReturnValue(of(testData)) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.meta).toEqual({ page: 1, total: 10 });
      done();
    });
  });

  it('should use message from data when present', (done) => {
    const testData = { message: 'Custom message', id: '1' };
    mockCallHandler = { handle: jest.fn().mockReturnValue(of(testData)) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.message).toBe('Custom message');
      done();
    });
  });

  it('should use default message for 201 statusCode', (done) => {
    const mockCtx = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({ statusCode: 201 }),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = { handle: jest.fn().mockReturnValue(of({ data: 'test' })) };

    interceptor.intercept(mockCtx, mockCallHandler).subscribe((result) => {
      expect(result.statusCode).toBe(201);
      done();
    });
  });
});
