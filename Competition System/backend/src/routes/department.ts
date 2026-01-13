import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse, createdResponse } from '../utils/response';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 获取学院列表
router.get('/', authenticate, async (_req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    return successResponse(res, departments);
  } catch (error) {
    next(error);
  }
});

// 创建学院
router.post('/', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const department = await prisma.department.create({
      data: { name, code },
    });
    return createdResponse(res, department, '学院创建成功');
  } catch (error) {
    next(error);
  }
});

// 更新学院
router.put('/:id', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: { name, code },
    });
    return successResponse(res, department, '学院更新成功');
  } catch (error) {
    next(error);
  }
});

// 删除学院
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({
      where: { id: parseInt(id) },
    });
    return successResponse(res, null, '学院删除成功');
  } catch (error) {
    next(error);
  }
});

export default router;
