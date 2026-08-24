import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './services/notificationService.js';
import { OrderService } from './services/orderService.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createAdminRouter } from './routes/adminRoutes.js';
import { createOrderRouter } from './routes/orderRoutes.js';

dotenv.config();

export function createApp(prismaClient?: PrismaClient) {
  const app = express();
  const prisma = prismaClient || new PrismaClient();
  const notificationService = new NotificationService(prisma);
  const orderService = new OrderService(prisma, notificationService);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (
          !requestOrigin ||
          requestOrigin.includes('vercel.app') ||
          requestOrigin.includes('localhost') ||
          requestOrigin.includes('127.0.0.1') ||
          requestOrigin === process.env.FRONTEND_URL
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount routers
  app.use('/api/auth', createAuthRouter(prisma, notificationService));
  app.use('/api/admin', createAdminRouter(prisma, notificationService));
  app.use('/api/orders', createOrderRouter(prisma, orderService));

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Global Error]', err);
    res.status(err.statusCode || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return { app, prisma, orderService };
}
