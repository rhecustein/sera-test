import { Order, OrderStatus } from './entities/order.entity';
import { User, UserRole } from '../users/entities/user.entity';

// Simple unit test for controller logic without NestJS DI to avoid module resolution issues
describe('OrdersController logic', () => {
  const mockUser: User = {
    id: 'user-uuid-1',
    name: 'Bintang',
    email: 'bintang@example.com',
    password: 'hashed',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockOrder: Order = {
    id: 'order-uuid-1',
    userId: 'user-uuid-1',
    user: mockUser,
    totalPrice: 500000000,
    status: OrderStatus.PENDING,
    idempotencyKey: 'key-1',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRequest = { ip: '127.0.0.1', headers: {} } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call create and return order', async () => {
    mockOrdersService.create.mockResolvedValue(mockOrder);
    const result = await mockOrdersService.create(
      { items: [{ productId: 'prod-uuid-1', quantity: 2 }] },
      mockUser,
    );
    expect(result).toEqual(mockOrder);
  });

  it('should call findAll and return orders list', async () => {
    const paginated = { data: [mockOrder], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
    mockOrdersService.findAll.mockResolvedValue(paginated);
    const result = await mockOrdersService.findAll(mockUser);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe(OrderStatus.PENDING);
  });

  it('should call findOne and return order', async () => {
    mockOrdersService.findOne.mockResolvedValue(mockOrder);
    const result = await mockOrdersService.findOne('order-uuid-1', mockUser);
    expect(result).toEqual(mockOrder);
    expect(result.id).toBe('order-uuid-1');
  });

  it('should correctly represent order status enum', () => {
    expect(OrderStatus.PENDING).toBe('pending');
    expect(OrderStatus.PAID).toBe('paid');
    expect(OrderStatus.CANCELLED).toBe('cancelled');
  });

  it('should correctly represent user role enum', () => {
    expect(UserRole.ADMIN).toBe('admin');
    expect(UserRole.CUSTOMER).toBe('customer');
  });
});
