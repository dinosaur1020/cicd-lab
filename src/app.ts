import Fastify, { FastifyServerOptions } from 'fastify';

export function buildApp(options: FastifyServerOptions = {}) {
  // 作業 5.1：故意製造型別錯誤以便 CI 失敗截圖；截圖完成後請刪除此行與下一行
  const _ciDemoTypeError: string = 1;

  const app = Fastify({
    logger: options.logger ?? true,
    ...options
  });

  app.get('/', async () => {
    return {
      message: 'CI/CD Lab Fastify app is running',
      version: process.env.APP_VERSION || 'dev'
    };
  });

  app.get('/health', async () => {
    return {
      status: 'ok'
    };
  });

  app.get('/version', async () => {
    return { version: process.env.APP_VERSION || 'dev' };
  });

  return app;
}
