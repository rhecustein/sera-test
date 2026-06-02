import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProduct: Product = {
    id: 'prod-uuid-1',
    name: 'Toyota Avanza',
    description: 'MPV 7 seater',
    price: 250000000,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    decrement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll({ page: 1, limit: 10, search: 'Toyota' });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: ILike('%Toyota%') } }),
      );
    });

    it('should return empty when no products', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-uuid-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a product', async () => {
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create({
        name: 'Toyota Avanza',
        price: 250000000,
        stock: 10,
      });

      expect(result).toEqual(mockProduct);
      expect(mockRepository.save).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('update', () => {
    it('should update and return the product', async () => {
      const updated = { ...mockProduct, name: 'Toyota Avanza New' };
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update('prod-uuid-1', { name: 'Toyota Avanza New' });
      expect(result.name).toBe('Toyota Avanza New');
    });

    it('should throw NotFoundException on update of non-existent product', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('prod-uuid-1');
      expect(mockRepository.softDelete).toHaveBeenCalledWith('prod-uuid-1');
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockProduct, stock: 10 });
      mockRepository.decrement.mockResolvedValue({ affected: 1 });

      await service.decrementStock('prod-uuid-1', 3);
      expect(mockRepository.decrement).toHaveBeenCalledWith(
        { id: 'prod-uuid-1' },
        'stock',
        3,
      );
    });

    it('should throw BadRequestException when stock insufficient', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockProduct, stock: 2 });

      await expect(service.decrementStock('prod-uuid-1', 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
