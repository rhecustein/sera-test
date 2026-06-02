import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, InjectDataSource } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { OrderJobsProducer } from '../queue/jobs/order-jobs.producer';

describe('OrdersService', () => {
  let service: OrdersService;

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

  const mockProduct: Product = {
    id: 'prod-uuid-1',
    name: 'Toyota Avanza',
    description: 'MPV',
    price: 250000000,
    stock: 10,
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

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      decrement: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockJobsProducer = {
    dispatchInvoiceEmail: jest.fn().mockResolvedValue(undefined),
    dispatchActivityLog: jest.fn().mockResolvedValue(undefined),
    dispatchNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
        { provide: OrderJobsProducer, useValue: mockJobsProducer },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  describe('create', () => {
    it('should create order successfully', async () => {
      mockOrderRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOrder);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockProduct);
      mockQueryRunner.manager.create.mockReturnValue(mockOrder);
      mockQueryRunner.manager.save.mockResolvedValue(mockOrder);

      const result = await service.create(
        { items: [{ productId: 'prod-uuid-1', quantity: 2 }] },
        mockUser,
      );

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockJobsProducer.dispatchInvoiceEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate idempotency key', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.create(
          { items: [{ productId: 'prod-uuid-1', quantity: 1 }], idempotencyKey: 'key-1' },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should rollback transaction on error', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          { items: [{ productId: 'nonexistent', quantity: 1 }] },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock insufficient', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockProduct,
        stock: 1,
      });

      await expect(
        service.create(
          { items: [{ productId: 'prod-uuid-1', quantity: 5 }] },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return own orders for customer with pagination', async () => {
      mockOrderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.findAll(mockUser);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toHaveProperty('total', 1);
    });

    it('should return all orders for admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockOrderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.findAll(adminUser);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return an order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-uuid-1', mockUser);
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
