import { Request, Response, NextFunction } from 'express';
import { sendError } from '@utils/response';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[ERROR]', error);

  if (error instanceof AppError) {
    sendError(res, error.message, error.statusCode);
    return;
  }

  sendError(res, 'Internal server error', 500);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  sendError(res, `Route not found: ${req.originalUrl}`, 404, 'Not Found');
};
