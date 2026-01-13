import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

const prisma = new PrismaClient();

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: Role;
      user?: any;
    }
  }
}

interface JwtPayload {
  userId: number;
  role: Role;
  iat: number;
  exp: number;
}

// 验证JWT Token
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('未提供认证令牌');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // 查询用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { department: true },
      });

      if (!user) {
        throw new UnauthorizedError('用户不存在');
      }

      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.user = user;

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('认证令牌已过期');
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('无效的认证令牌');
      }
      throw jwtError;
    }
  } catch (error) {
    next(error);
  }
};

// 角色权限检查
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new UnauthorizedError('未授权访问'));
    }

    if (!allowedRoles.includes(req.userRole)) {
      return next(new ForbiddenError('权限不足'));
    }

    next();
  };
};

// 超级管理员权限
export const requireSuperAdmin = authorize('SUPER_ADMIN');

// 校级及以上管理员权限
export const requireSchoolAdmin = authorize('SUPER_ADMIN', 'SCHOOL_ADMIN');

// 院级及以上管理员权限
export const requireDepartmentAdmin = authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN');

// 教师及以上权限
export const requireTeacher = authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER');

// 可选认证 - 如果有token则解析，没有也继续
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // 没有token也继续
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.userId = decoded.userId;
      req.userRole = decoded.role;
    } catch {
      // token无效也继续，只是不设置userId
    }

    next();
  } catch (error) {
    next(error);
  }
};
