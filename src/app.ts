import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from '@config/config';
import { errorHandler, notFoundHandler } from '@middleware/errorHandler';

// Routes
import authRoutes from '@routes/authRoutes';
import artistRoutes from '@routes/artistRoutes';
import albumRoutes from '@routes/albumRoutes';
import analyticsRoutes from '@routes/analyticsRoutes';
import dashboardRoutes from '@routes/dashboardRoutes';
import uploadRoutes from '@routes/uploadRoutes';
import syncRoutes from '@routes/syncRoutes';
import homePageRoutes from '@routes/homePageRoutes';
import contractRoutes from '@routes/contractRoutes';
import revenueRoutes from '@routes/revenueRoutes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.frontend.url,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/home-page', homePageRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/revenue', revenueRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

export default app;
