import { Response } from 'express';
import type { ApiResponse } from '@schemas/index';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    statusCode,
  } as ApiResponse<T>);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  } as ApiResponse<null>);
};

export const handleError = (
  res: Response,
  error: any,
  defaultMessage: string = 'Internal server error'
): Response => {
  console.error('[ERROR]', error);

  const statusCode = error?.statusCode || error?.status || 500;
  const message = error?.message || defaultMessage;

  return sendError(res, message, statusCode);
};
