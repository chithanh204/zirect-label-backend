import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { generateToken } from '@utils/jwt';
import { db } from '@models/db';
import type { User } from '@schemas/index';

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    const user = db.getUserByEmail(email);

    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    // Mock auth - In production, use bcrypt.compare()
    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).password;

    const token = generateToken(userWithoutPassword as User);

    sendSuccess(
      res,
      {
        user: userWithoutPassword,
        token,
      },
      'Login successful',
      200
    );
  } catch (error) {
    handleError(res, error, 'Login failed');
  }
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, name, password, userType } = req.body;

    if (!email || !name || !password) {
      sendError(res, 'Email, name, and password are required', 400);
      return;
    }

    // Only allow registering as 'artist' for public registration
    // Admin users must be created by system administrators
    const type = userType === 'admin' ? 'artist' : 'artist'; // Default to artist

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      password: 'hashed_password',
      type: type as 'artist' | 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.createUser(newUser);

    const userWithoutPassword = { ...newUser };
    delete (userWithoutPassword as any).password;

    const token = generateToken(userWithoutPassword as User);

    sendSuccess(
      res,
      {
        user: userWithoutPassword,
        token,
      },
      'Registration successful',
      201
    );
  } catch (error) {
    handleError(res, error, 'Registration failed');
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = db.getUserById(req.user.id);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).password;

    sendSuccess(res, userWithoutPassword, 'User retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get user');
  }
};

export const logout = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(res, {}, 'Logout successful', 200);
  } catch (error) {
    handleError(res, error, 'Logout failed');
  }
};
