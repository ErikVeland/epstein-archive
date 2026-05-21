import 'dotenv/config';
import { App } from './app.js';
import { logger } from './server/services/Logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Safety nets: prevent silent crashes from unhandled async errors ──────────
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

async function bootstrap() {
  try {
    const app = new App();
    await app.init();
    await app.listen(PORT);
    process.send?.('ready');

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await app.shutdown();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
