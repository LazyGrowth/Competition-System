import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse, paginatedResponse, createdResponse, deletedResponse } from '../utils/response';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 搜索学生
export const searchStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return successResponse(res, []);
    }

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { studentId: { contains: keyword as string } },
          { name: { contains: keyword as string } },
        ],
      },
      include: { department: true },
      take: 20,
    });

    return successResponse(res, students);
  } catch (error) {
    next(error);
  }
};

// 获取学生列表
export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { departmentId, major } = req.query;

    const where: any = {};

    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }
    if (major) {
      where.major = { contains: major as string };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { department: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    return paginatedResponse(res, students, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取单个学生详情
export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        department: true,
        applications: {
          include: {
            application: {
              include: {
                competition: true,
                teacher: { select: { id: true, name: true } },
                award: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError('学生不存在');
    }

    return successResponse(res, student);
  } catch (error) {
    next(error);
  }
};

// 创建学生
export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, name, departmentId, major, contact } = req.body;

    if (!studentId || !name) {
      throw new BadRequestError('学号和姓名不能为空');
    }

    // 检查学号是否已存在
    const existing = await prisma.student.findUnique({ where: { studentId } });
    if (existing) {
      throw new BadRequestError('学号已存在');
    }

    const student = await prisma.student.create({
      data: {
        studentId,
        name,
        departmentId,
        major,
        contact,
      },
      include: { department: true },
    });

    return createdResponse(res, student, '学生创建成功');
  } catch (error) {
    next(error);
  }
};

// 更新学生信息
export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, departmentId, major, contact } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundError('学生不存在');
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name: name || student.name,
        departmentId: departmentId !== undefined ? departmentId : student.departmentId,
        major: major !== undefined ? major : student.major,
        contact: contact !== undefined ? contact : student.contact,
      },
      include: { department: true },
    });

    return successResponse(res, updatedStudent, '学生信息更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除学生
export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundError('学生不存在');
    }

    // 检查是否有关联申报
    const applicationCount = await prisma.applicationStudent.count({
      where: { studentId: id },
    });

    if (applicationCount > 0) {
      throw new BadRequestError('该学生有申报记录，无法删除');
    }

    await prisma.student.delete({ where: { id } });

    return deletedResponse(res, '学生删除成功');
  } catch (error) {
    next(error);
  }
};

// 同步学生信息
export const syncStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      throw new BadRequestError('请提供学号');
    }

    // 查找学生
    const student = await prisma.student.findUnique({
      where: { studentId },
      include: { department: true },
    });

    if (!student) {
      throw new NotFoundError('未找到该学生信息');
    }

    return successResponse(res, student, '学生信息同步成功');
  } catch (error) {
    next(error);
  }
};

// 获取教师历史参赛学生列表（用于快速添加学生）
export const getMyHistoryStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 获取该教师所有申请中的学生
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { teacherId: userId },
          { coTeacherId: userId },
        ],
      },
      include: {
        students: {
          include: {
            student: {
              include: { department: true },
            },
          },
        },
      },
    });

    // 汇总去重学生
    const studentMap = new Map();
    applications.forEach(app => {
      app.students.forEach(as => {
        if (!studentMap.has(as.student.id)) {
          studentMap.set(as.student.id, {
            ...as.student,
            applicationCount: 1,
          });
        } else {
          const existing = studentMap.get(as.student.id);
          existing.applicationCount += 1;
        }
      });
    });

    // 按参赛次数排序
    const students = Array.from(studentMap.values()).sort((a, b) => b.applicationCount - a.applicationCount);

    return successResponse(res, students);
  } catch (error) {
    next(error);
  }
};

// 批量同步学生（从历史记录）
export const batchSyncStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new BadRequestError('请选择要同步的学生');
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { department: true },
    });

    return successResponse(res, students, `成功同步 ${students.length} 名学生信息`);
  } catch (error) {
    next(error);
  }
};
