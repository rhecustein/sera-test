import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Reflector } from '@nestjs/core';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<ProductsService>;

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

  const mockPaginatedResult = {
    data: [mockProduct],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get(ProductsService);
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      productsService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll({});

      expect(productsService.findAll).toHaveBeenCalledWith({});
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
      expect(result.message).toBe('Products fetched successfully');
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      productsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('prod-uuid-1');

      expect(result.data).toEqual(mockProduct);
      expect(result.message).toBe('Product fetched successfully');
    });
  });

  describe('create', () => {
    it('should create and return product', async () => {
      productsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create({
        name: 'Toyota Avanza',
        price: 250000000,
        stock: 10,
      });

      expect(result.data).toEqual(mockProduct);
      expect(result.message).toBe('Product created successfully');
    });
  });

  describe('update', () => {
    it('should update and return product', async () => {
      const updated = { ...mockProduct, stock: 20 };
      productsService.update.mockResolvedValue(updated);

      const result = await controller.update('prod-uuid-1', { stock: 20 });

      expect(result.data.stock).toBe(20);
      expect(result.message).toBe('Product updated successfully');
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      productsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('prod-uuid-1');

      expect(productsService.remove).toHaveBeenCalledWith('prod-uuid-1');
      expect(result.message).toBe('Product deleted successfully');
    });
  });
});
