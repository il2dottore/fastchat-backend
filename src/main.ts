import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { SussyValidationPipe } from './pipes/validation.pipe';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

const defaultEnvPath = fs.existsSync('.env') ? '.env' : 'src/.env';
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH ?? defaultEnvPath,
});

export class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    return server;
  }
}


async function bootstrap() {
  const host = process.env.HOST ?? '0.0.0.0';
  const keyPath = process.env.HTTPS_KEY_PATH ?? 'certs/key.pem';
  const certPath = process.env.HTTPS_CERT_PATH ?? 'certs/cert.pem';
  const hasHttpsCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);
  const httpsRequested = process.env.HTTPS_ENABLED !== 'false';

  if (httpsRequested && !hasHttpsCerts) {
    throw new Error(
      `HTTPS is enabled but certificates were not found at ${keyPath} and ${certPath}.`,
    );
  }

  const httpsEnabled = httpsRequested && hasHttpsCerts;
  const port = Number(process.env.PORT ?? (httpsEnabled ? 443 : 3000));

  const app = await NestFactory.create(
    AppModule,
    httpsEnabled
      ? {
          httpsOptions: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
        }
      : undefined,
  );

  app.useGlobalPipes(new SussyValidationPipe);
  app.use(cookieParser());
  app.useWebSocketAdapter(new CustomIoAdapter(app));
  await app.listen(port, host);
}
bootstrap();
