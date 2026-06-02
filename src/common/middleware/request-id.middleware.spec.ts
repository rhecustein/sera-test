import { RequestIdMiddleware } from './request-id.middleware';
import { Request, Response } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should inject a new X-Request-ID when not present', () => {
    const mockReq = { headers: {} } as Request;

    middleware.use(mockReq, mockRes as Response, mockNext);

    expect(mockReq.headers['x-request-id']).toBeDefined();
    expect(typeof mockReq.headers['x-request-id']).toBe('string');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      mockReq.headers['x-request-id'],
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should preserve existing X-Request-ID', () => {
    const existingId = 'existing-request-id-123';
    const mockReq = {
      headers: { 'x-request-id': existingId },
    } as unknown as Request;

    middleware.use(mockReq, mockRes as Response, mockNext);

    expect(mockReq.headers['x-request-id']).toBe(existingId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
  });

  it('should call next()', () => {
    const mockReq = { headers: {} } as Request;

    middleware.use(mockReq, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
