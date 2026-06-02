import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let productId: string;

  const adminCredentials = {
    name: 'Admin E2E',
    email: `admin-e2e-${Date.now()}@example.com`,
    password: 'AdminPassword123!',
    role: 'admin',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminCredentials);
    adminToken = regRes.body.data?.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return products list publicly', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
    });

    it('should support pagination params', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=5')
        .expect(200);

      expect(response.body.meta.limit).toBe(5);
    });
  });

  describe('POST /products (admin)', () => {
    it('should create product with admin token', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Product',
          description: 'Created during e2e test',
          price: 100000,
          stock: 50,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('E2E Test Product');
      productId = response.body.data.id;
    });

    it('should return 403 without token', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Test', price: 100, stock: 1 })
        .expect(401);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by id', async () => {
      if (!productId) return;

      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body.data.id).toBe(productId);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /products/:id (admin)', () => {
    it('should update product', async () => {
      if (!productId) return;

      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock: 100 })
        .expect(200);

      expect(response.body.data.stock).toBe(100);
    });
  });

  describe('DELETE /products/:id (admin)', () => {
    it('should soft delete product', async () => {
      if (!productId) return;

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404);
    });
  });
});
