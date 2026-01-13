import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    console.error('错误详情:', err);
    return res.status(statusCode).json({
      success: false,
      message,
      error: err.message,
      stack: err.stack,
    });
  }

  // 生产环境只返回简洁错误信息
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? '服务器内部错误' : message,
  });
};

// 创建自定义错误
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 常用错误类型
export class BadRequestError extends CustomError {
  constructor(message: string = '请求参数错误') {
    super(message, 400);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = '未授权访问') {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = '禁止访问') {
    super(message, 403);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = '资源不存在') {
    super(message, 404);
  }
}
