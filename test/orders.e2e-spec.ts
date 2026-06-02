import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let customerToken: string;
  let productId: string;
  let orderId: string;

  const customerCredentials = {
    name: 'Customer E2E',
    email: `customer-e2e-${Date.now()}@example.com`,
    password: 'CustomerPass123!',
    role: 'customer',
  };

  const adminCredentials = {
    name: 'Admin Orders E2E',
    email: `admin-orders-e2e-${Date.now()}@example.com`,
    password: 'AdminOrders123!',
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

    const customerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(customerCredentials);
    customerToken = customerRes.body.data?.access_token;

    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminCredentials);
    const adminToken = adminRes.body.data?.access_token;

    const productRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Order E2E Product', price: 50000, stock: 100 });
    productId = productRes.body.data?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create an order for customer', async () => {
      if (!productId) return;

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId, quantity: 2 }],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
      orderId = response.body.data.id;
    });

    it('should return 400 for out-of-stock', async () => {
      if (!productId) return;

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId, quantity: 99999 }] })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId, quantity: 1 }] })
        .expect(401);
    });

    it('should return 409 on duplicate idempotency key', async () => {
      if (!productId) return;

      const idempotencyKey = `idem-key-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId, quantity: 1 }], idempotencyKey });

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId, quantity: 1 }], idempotencyKey })
        .expect(409);
    });
  });

  describe('GET /orders', () => {
    it('should return customer order history', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/orders').expect(401);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order detail', async () => {
      if (!orderId) return;

      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(orderId);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);
    });
  });
});
