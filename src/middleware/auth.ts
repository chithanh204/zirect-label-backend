import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@utils/jwt';
import { sendError } from '@utils/response';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      sendError(res, 'No token provided', 401, 'Unauthorized');
      return;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      sendError(res, 'Invalid or expired token', 401, 'Unauthorized');
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Authentication failed', 401, 'Unauthorized');
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.type !== 'admin') {
    sendError(res, 'Admin access required', 403, 'Forbidden');
    return;
  }
  next();
};

export const artistMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.type !== 'artist') {
    sendError(res, 'Artist access required', 403, 'Forbidden');
    return;
  }
  next();
};
