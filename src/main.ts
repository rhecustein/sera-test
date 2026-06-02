import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
        },
      },
    }),
  );

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const metricsService = app.get(MetricsService);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(metricsService),
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SERA Backend API')
    .setDescription(
      `## PT Serasi Autoraya — Technical Test\n\n` +
      `REST API backend untuk sistem e-commerce sederhana dengan fitur:\n` +
      `- **Auth** — Register & Login dengan JWT\n` +
      `- **Products** — CRUD produk (admin only untuk mutasi)\n` +
      `- **Orders** — Buat & lihat order dengan idempotency\n` +
      `- **Health** — Status DB & Redis\n` +
      `- **Metrics** — Request count, error rate, latency\n\n` +
      `> Gunakan endpoint \`POST /auth/login\` lalu klik **Authorize** di kanan atas untuk mengisi token JWT.`,
    )
    .setVersion('1.0')
    .setContact('SERA Dev', '', 'dev@sera.co.id')
    .addTag('Auth', 'Register dan login untuk mendapatkan JWT token')
    .addTag('Products', 'Manajemen produk — publik untuk read, admin untuk mutasi')
    .addTag('Orders', 'Buat dan lihat history order — memerlukan autentikasi')
    .addTag('Health', 'Health check status database dan Redis')
    .addTag('Metrics', 'Statistik request, error rate, dan latency')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Masukkan token JWT dari response login' },
      'JWT',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'SERA API Docs',
    customCss: `
      .swagger-ui .topbar { background: #1a1a2e; padding: 10px 0; }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before {
        content: '⚡ SERA Backend API';
        color: #e94560;
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: 1px;
        padding-left: 24px;
      }
      .swagger-ui .info { margin: 30px 0 20px; }
      .swagger-ui .info .title { color: #1a1a2e; font-size: 2rem; }
      .swagger-ui .info .description p { color: #444; line-height: 1.7; }
      .swagger-ui .scheme-container { background: #f8f9ff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
      .swagger-ui .opblock-tag { font-size: 1rem; font-weight: 600; border-bottom: 2px solid #e94560; color: #1a1a2e; }
      .swagger-ui .opblock-tag:hover { background: #fff5f5; }
      .swagger-ui .opblock.opblock-post { border-color: #e94560; background: #fff5f7; }
      .swagger-ui .opblock.opblock-get { border-color: #0055cc; background: #f0f6ff; }
      .swagger-ui .opblock.opblock-patch { border-color: #e67e00; background: #fff8f0; }
      .swagger-ui .opblock.opblock-delete { border-color: #cc0000; background: #fff5f5; }
      .swagger-ui .opblock .opblock-summary-method { border-radius: 4px; font-weight: 700; min-width: 70px; }
      .swagger-ui .btn.authorize { background: #e94560; border-color: #e94560; color: #fff; border-radius: 6px; }
      .swagger-ui .btn.authorize:hover { background: #c73a52; }
      .swagger-ui .btn.authorize svg { fill: #fff; }
      .swagger-ui section.models { border: 1px solid #e8e8e8; border-radius: 8px; }
      .swagger-ui section.models h4 { color: #1a1a2e; }
      .swagger-ui .model-title { color: #e94560; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = configService.get<number>('PORT', 60010);
  await app.listen(port);
  console.log(`SERA Backend running on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
}
bootstrap();
