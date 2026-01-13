import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { validationResult } from 'express-validator';
import { successResponse, paginatedResponse, createdResponse, deletedResponse, errorResponse } from '../utils/response';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获取我的申报列表
export const getMyApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { status } = req.query;

    const where: any = {
      OR: [
        { teacherId: userId },
        { coTeacherId: userId },
      ],
    };

    if (status) {
      where.status = status as ApplicationStatus;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          competition: { include: { leadDepartment: true } },
          teacher: { select: { id: true, name: true, employeeId: true } },
          coTeacher: { select: { id: true, name: true, employeeId: true } },
          students: { include: { student: true } },
          approvalRecords: {
            include: { approver: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    return paginatedResponse(res, applications, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取所有申报列表（管理员）
export const getApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { status, competitionId, teacherId, departmentId } = req.query;
    const user = req.user;

    const where: any = {};

    // 院级管理员只能看到本院的申报
    if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      where.teacher = { departmentId: user.departmentId };
    }

    if (status) {
      where.status = status as ApplicationStatus;
    }
    if (competitionId) {
      where.competitionId = parseInt(competitionId as string);
    }
    if (teacherId) {
      where.teacherId = parseInt(teacherId as string);
    }
    if (departmentId) {
      where.teacher = { ...where.teacher, departmentId: parseInt(departmentId as string) };
    }

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
            take: 1,
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    return paginatedResponse(res, applications, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取单个申报详情
export const getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;
    const userRole = req.userRole;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        competition: { include: { leadDepartment: true } },
        teacher: { select: { id: true, name: true, employeeId: true, department: true } },
        coTeacher: { select: { id: true, name: true, employeeId: true } },
        students: { include: { student: true } },
        approvalRecords: {
          include: { approver: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        award: true,
      },
    });

    if (!application) {
      throw new NotFoundError('申报不存在');
    }

    // 权限检查：教师只能查看自己的申报
    if (userRole === 'TEACHER' && application.teacherId !== userId && application.coTeacherId !== userId) {
      throw new ForbiddenError('无权查看此申报');
    }

    return successResponse(res, application);
  } catch (error) {
    next(error);
  }
};

// 创建申报
export const createApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, '验证失败', 400, errors.array());
    }

    const userId = req.userId!;
    const { competitionId, coTeacherId, studentIds } = req.body;

    // 检查竞赛是否存在且有效
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundError('竞赛不存在');
    }

    if (competition.validUntil && competition.validUntil < new Date()) {
      throw new BadRequestError('该竞赛已过期');
    }

    // 检查是否已申报过该竞赛
    const existingApplication = await prisma.application.findFirst({
      where: {
        competitionId,
        teacherId: userId,
        status: { not: 'REJECTED' },
      },
    });

    if (existingApplication) {
      throw new BadRequestError('您已申报过该竞赛');
    }

    // 创建申报
    const application = await prisma.application.create({
      data: {
        competitionId,
        teacherId: userId,
        coTeacherId: coTeacherId || null,
        status: 'DRAFT',
        students: studentIds?.length > 0 ? {
          create: studentIds.map((studentId: number) => ({
            studentId,
          })),
        } : undefined,
      },
      include: {
        competition: true,
        teacher: { select: { id: true, name: true, employeeId: true } },
        coTeacher: { select: { id: true, name: true, employeeId: true } },
        students: { include: { student: true } },
      },
    });

    return createdResponse(res, application, '申报创建成功');
  } catch (error) {
    next(error);
  }
};

// 更新申报
export const updateApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;
    const { coTeacherId, studentIds } = req.body;

    const application = await prisma.application.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundError('申报不存在');
    }

    if (application.teacherId !== userId) {
      throw new ForbiddenError('无权修改此申报');
    }

    // 只有草稿或被驳回状态才能修改
    if (!['DRAFT', 'REJECTED', 'REVISION_REQUIRED'].includes(application.status)) {
      throw new BadRequestError('当前状态不允许修改');
    }

    // 更新申报
    await prisma.$transaction(async (tx) => {
      // 删除原有学生关联
      await tx.applicationStudent.deleteMany({ where: { applicationId: id } });

      // 更新申报
      await tx.application.update({
        where: { id },
        data: {
          coTeacherId: coTeacherId || null,
          students: studentIds?.length > 0 ? {
            create: studentIds.map((studentId: number) => ({ studentId })),
          } : undefined,
        },
      });
    });

    const updatedApplication = await prisma.application.findUnique({
      where: { id },
      include: {
        competition: true,
        teacher: { select: { id: true, name: true, employeeId: true } },
        coTeacher: { select: { id: true, name: true, employeeId: true } },
        students: { include: { student: true } },
      },
    });

    return successResponse(res, updatedApplication, '申报更新成功');
  } catch (error) {
    next(error);
  }
};

// 提交申报
export const submitApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { students: true },
    });

    if (!application) {
      throw new NotFoundError('申报不存在');
    }

    if (application.teacherId !== userId) {
      throw new ForbiddenError('无权提交此申报');
    }

    if (!['DRAFT', 'REJECTED', 'REVISION_REQUIRED'].includes(application.status)) {
      throw new BadRequestError('当前状态不允许提交');
    }

    // 验证是否有学生
    if (application.students.length === 0) {
      throw new BadRequestError('请至少添加一名学生');
    }

    // 更新状态为待院级审核
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: 'PENDING_DEPARTMENT',
        submittedAt: new Date(),
      },
      include: {
        competition: true,
        teacher: { select: { id: true, name: true, employeeId: true } },
        students: { include: { student: true } },
      },
    });

    return successResponse(res, updatedApplication, '申报已提交，等待审核');
  } catch (error) {
    next(error);
  }
};

// 删除申报
export const deleteApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;

    const application = await prisma.application.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundError('申报不存在');
    }

    if (application.teacherId !== userId) {
      throw new ForbiddenError('无权删除此申报');
    }

    if (application.status !== 'DRAFT') {
      throw new BadRequestError('只能删除草稿状态的申报');
    }

    await prisma.application.delete({ where: { id } });

    return deletedResponse(res, '申报删除成功');
  } catch (error) {
    next(error);
  }
};
