import { ConfigService } from '@nestjs/config';

export const mailConfig = (configService: ConfigService) => ({
  host: configService.get<string>('MAIL_HOST', 'smtp.hostinger.com'),
  port: configService.get<number>('MAIL_PORT', 465),
  secure: configService.get<string>('MAIL_SECURE', 'true') === 'true',
  auth: {
    user: configService.get<string>('MAIL_USER', ''),
    pass: configService.get<string>('MAIL_PASS', ''),
  },
  from: configService.get<string>('MAIL_FROM', 'SERA System <noreply@sera.co.id>'),
});
