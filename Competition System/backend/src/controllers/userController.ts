import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { successResponse, paginatedResponse, createdResponse, deletedResponse, errorResponse } from '../utils/response';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获取用户列表
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { role, departmentId, name } = req.query;
    const user = req.user;

    const where: any = {};

    // 院级管理员只能看到本院用户
    if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      where.departmentId = user.departmentId;
    }

    if (role) {
      where.role = role as Role;
    }
    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }
    if (name) {
      where.OR = [
        { name: { contains: name as string } },
        { employeeId: { contains: name as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          name: true,
          gender: true,
          role: true,
          performanceScore: true,
          department: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(res, users, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取单个用户详情
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        gender: true,
        role: true,
        performanceScore: true,
        monthlyEditCount: true,
        lastEditMonth: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

// 创建用户
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, password, name, gender, role, departmentId } = req.body;

    // 检查工号是否已存在
    const existing = await prisma.user.findUnique({ where: { employeeId } });
    if (existing) {
      throw new BadRequestError('工号已存在');
    }

    const hashedPassword = await bcrypt.hash(password || '123456', 10);

    const user = await prisma.user.create({
      data: {
        employeeId,
        password: hashedPassword,
        name,
        gender,
        role: role as Role || 'TEACHER',
        departmentId,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        gender: true,
        role: true,
        department: true,
      },
    });

    return createdResponse(res, user, '用户创建成功');
  } catch (error) {
    next(error);
  }
};

// 更新用户
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, gender, role, departmentId, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (gender) updateData.gender = gender;
    if (role) updateData.role = role as Role;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        name: true,
        gender: true,
        role: true,
        department: true,
      },
    });

    return successResponse(res, updatedUser, '用户更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除用户
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 检查是否有关联数据
    const applicationCount = await prisma.application.count({
      where: { teacherId: id },
    });

    if (applicationCount > 0) {
      throw new BadRequestError('该用户有申报记录，无法删除');
    }

    await prisma.user.delete({ where: { id } });

    return deletedResponse(res, '用户删除成功');
  } catch (error) {
    next(error);
  }
};

// 重置用户密码
export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 重置为默认密码 123456
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return successResponse(res, null, '密码重置成功');
  } catch (error) {
    next(error);
  }
};

// 更新个人信息
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, '验证失败', 400, errors.array());
    }

    const userId = req.userId!;
    const { name, gender, bankAccount, bankName } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 检查本月修改次数
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthlyEditCount = user.lastEditMonth === currentMonth ? user.monthlyEditCount : 0;
    let penaltyScore = 0;

    // 检查是否是首次填写（某些字段为空）
    const isFirstTime = !user.name || !user.gender || !user.bankAccount;

    // 如果不是首次填写，且已超过免费次数，则需要扣分
    if (!isFirstTime && monthlyEditCount >= 1) {
      penaltyScore = 1; // 扣除1分绩效
      
      // 检查绩效分是否足够
      const currentScore = Number(user.performanceScore) || 0;
      if (currentScore < penaltyScore) {
        throw new BadRequestError(`绩效分不足，无法修改。当前绩效分：${currentScore}，本次修改需扣除：${penaltyScore}分`);
      }
    }

    // 检查是否有实际变更
    const hasChanges = (name && name !== user.name) ||
                       (gender && gender !== user.gender) ||
                       (bankAccount && bankAccount !== user.bankAccount) ||
                       (bankName && bankName !== user.bankName);

    if (!hasChanges) {
      return successResponse(res, user, '没有需要更新的信息');
    }

    // 记录修改
    const logEntries = [];
    if (name && name !== user.name) {
      logEntries.push({ userId, fieldName: 'name', oldValue: user.name, newValue: name, penaltyScore });
    }
    if (gender && gender !== user.gender) {
      logEntries.push({ userId, fieldName: 'gender', oldValue: user.gender, newValue: gender, penaltyScore });
    }
    if (bankAccount && bankAccount !== user.bankAccount) {
      logEntries.push({ userId, fieldName: 'bankAccount', oldValue: '***', newValue: '***', penaltyScore });
    }
    if (bankName && bankName !== user.bankName) {
      logEntries.push({ userId, fieldName: 'bankName', oldValue: user.bankName, newValue: bankName, penaltyScore });
    }

    // 执行更新
    await prisma.$transaction(async (tx) => {
      // 更新用户信息
      await tx.user.update({
        where: { id: userId },
        data: {
          name: name || user.name,
          gender: gender || user.gender,
          bankAccount: bankAccount || user.bankAccount,
          bankName: bankName || user.bankName,
          monthlyEditCount: monthlyEditCount + 1,
          lastEditMonth: currentMonth,
          performanceScore: penaltyScore > 0 ? { decrement: penaltyScore } : undefined,
        },
      });

      // 记录修改日志
      if (logEntries.length > 0) {
        await tx.userInfoEditLog.createMany({ data: logEntries });
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        gender: true,
        bankName: true,
        performanceScore: true,
        monthlyEditCount: true,
        department: true,
      },
    });

    const message = penaltyScore > 0 
      ? `信息更新成功，本次修改扣除${penaltyScore}绩效分` 
      : '信息更新成功';

    return successResponse(res, updatedUser, message);
  } catch (error) {
    next(error);
  }
};

// 获取个人信息修改日志
export const getMyEditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const logs = await prisma.userInfoEditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return successResponse(res, logs);
  } catch (error) {
    next(error);
  }
};
