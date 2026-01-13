import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ApplicationStatus, ApprovalAction } from '@prisma/client';
import { validationResult } from 'express-validator';
import { successResponse, paginatedResponse, errorResponse } from '../utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获取待审批列表
export const getPendingApprovals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const user = req.user;

    let statusFilter: ApplicationStatus;
    const where: any = {};

    // 根据角色确定可审批的状态
    if (user.role === 'DEPARTMENT_ADMIN') {
      statusFilter = 'PENDING_DEPARTMENT';
      // 院级管理员只能审批本院的申报
      if (user.departmentId) {
        where.teacher = { departmentId: user.departmentId };
      }
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
      statusFilter = 'PENDING_SCHOOL';
    } else {
      throw new ForbiddenError('无审批权限');
    }

    where.status = statusFilter;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          competition: { include: { leadDepartment: true } },
          teacher: { select: { id: true, name: true, employeeId: true, department: true } },
          coTeacher: { select: { id: true, name: true, employeeId: true } },
          students: { include: { student: true } },
          approvalRecords: {
            include: { approver: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { submittedAt: 'asc' },
      }),
      prisma.application.count({ where }),
    ]);

    return paginatedResponse(res, applications, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 审批申报
export const approveApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, '验证失败', 400, errors.array());
    }

    const id = parseInt(req.params.id);
    const userId = req.userId!;
    const user = req.user;
    const { action, comment } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!application) {
      throw new NotFoundError('申报不存在');
    }

    // 检查权限
    let newStatus: ApplicationStatus;
    let canApprove = false;

    if (user.role === 'DEPARTMENT_ADMIN') {
      if (application.status !== 'PENDING_DEPARTMENT') {
        throw new BadRequestError('该申报不在院级审批阶段');
      }
      // 检查是否是本院的申报
      if (user.departmentId && application.teacher.departmentId !== user.departmentId) {
        throw new ForbiddenError('无权审批其他院系的申报');
      }
      canApprove = true;
      
      if (action === 'APPROVE') {
        newStatus = 'PENDING_SCHOOL';
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED';
      } else {
        newStatus = 'REVISION_REQUIRED';
      }
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
      if (application.status !== 'PENDING_SCHOOL') {
        throw new BadRequestError('该申报不在校级审批阶段');
      }
      canApprove = true;

      if (action === 'APPROVE') {
        newStatus = 'APPROVED';
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED';
      } else {
        newStatus = 'REVISION_REQUIRED';
      }
    }

    if (!canApprove) {
      throw new ForbiddenError('无审批权限');
    }

    // 执行审批
    await prisma.$transaction(async (tx) => {
      // 更新申报状态
      await tx.application.update({
        where: { id },
        data: { status: newStatus! },
      });

      // 创建审批记录
      await tx.approvalRecord.create({
        data: {
          applicationId: id,
          approverId: userId,
          action: action as ApprovalAction,
          comment,
        },
      });
    });

    const updatedApplication = await prisma.application.findUnique({
      where: { id },
      include: {
        competition: true,
        teacher: { select: { id: true, name: true, employeeId: true } },
        approvalRecords: {
          include: { approver: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const actionText = action === 'APPROVE' ? '通过' : action === 'REJECT' ? '驳回' : '要求修改';
    return successResponse(res, updatedApplication, `审批${actionText}成功`);
  } catch (error) {
    next(error);
  }
};

// 获取审批历史
export const getApprovalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const records = await prisma.approvalRecord.findMany({
      where: { applicationId: id },
      include: {
        approver: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, records);
  } catch (error) {
    next(error);
  }
};
