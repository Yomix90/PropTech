import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Une erreur interne est survenue';

  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
