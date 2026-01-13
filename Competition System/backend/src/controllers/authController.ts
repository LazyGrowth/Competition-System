import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { config } from '../config';
import { successResponse, errorResponse } from '../utils/response';
import { UnauthorizedError, BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 用户登录
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, '验证失败', 400, errors.array());
    }

    const { employeeId, password } = req.body;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: { department: true },
    });

    if (!user) {
      // 记录登录失败日志
      await prisma.operationLog.create({
        data: {
          action: 'LOGIN_FAILED',
          details: JSON.stringify({ employeeId, reason: '用户不存在' }),
          ip: req.ip || req.socket.remoteAddress,
        },
      });
      throw new UnauthorizedError('工号或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // 记录登录失败日志
      await prisma.operationLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          details: JSON.stringify({ reason: '密码错误' }),
          ip: req.ip || req.socket.remoteAddress,
        },
      });
      throw new UnauthorizedError('工号或密码错误');
    }

    // 生成JWT Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // 记录登录成功日志
    await prisma.operationLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        details: JSON.stringify({ role: user.role }),
        ip: req.ip || req.socket.remoteAddress,
      },
    });

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(res, {
      token,
      user: userWithoutPassword,
    }, '登录成功');
  } catch (error) {
    next(error);
  }
};

// 用户登出
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 记录登出日志（如果有用户ID）
    if (req.userId) {
      await prisma.operationLog.create({
        data: {
          userId: req.userId,
          action: 'LOGOUT',
          details: JSON.stringify({}),
          ip: req.ip || req.socket.remoteAddress,
        },
      });
    }
    // JWT无状态，客户端删除token即可
    return successResponse(res, null, '登出成功');
  } catch (error) {
    next(error);
  }
};

// 获取当前用户信息
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    const { password: _, ...userWithoutPassword } = user;

    // 获取本月修改信息
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyEditCount = user.lastEditMonth === currentMonth ? user.monthlyEditCount : 0;

    return successResponse(res, {
      ...userWithoutPassword,
      monthlyEditInfo: {
        count: monthlyEditCount,
        freeLimit: 1,
        remaining: Math.max(0, 1 - monthlyEditCount),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 修改密码
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new BadRequestError('请提供原密码和新密码');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('新密码长度至少为6位');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    // 验证原密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError('原密码错误');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return successResponse(res, null, '密码修改成功');
  } catch (error) {
    next(error);
  }
};
