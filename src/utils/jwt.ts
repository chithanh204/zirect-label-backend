import jwt from 'jsonwebtoken';
import config from '@config/config';
import type { User } from '@schemas/index';

export const generateToken = (user: Omit<User, 'password'>): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: user.type,
    },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};
