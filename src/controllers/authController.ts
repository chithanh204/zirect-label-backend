import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { generateToken } from '@utils/jwt';
import { db } from '@models/prisma';
import type { User } from '@schemas/index';
import bcrypt from 'bcryptjs';

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    const user = await db.getUserByEmail(email);

    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const userWithoutPassword: Omit<typeof user, 'password'> & { password?: string } = { ...user };
    delete userWithoutPassword.password;

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
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      sendError(res, 'Email, name, and password are required', 400);
      return;
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.createUser({
      email,
      name,
      password: hashedPassword,
      type: 'artist' as const,
    });

    const userWithoutPassword: Omit<typeof newUser, 'password'> & { password?: string } = { ...newUser };
    delete userWithoutPassword.password;

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

    const user = await db.getUserById(req.user.id);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const userWithoutPassword: Omit<typeof user, 'password'> & { password?: string } = { ...user };
    delete userWithoutPassword.password;

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
