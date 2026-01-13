import { Request, Response, NextFunction } from 'express';
import { PrismaClient, CompetitionLevel, AwardLevel } from '@prisma/client';
import { successResponse, paginatedResponse } from '../utils/response';
import { BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获取绩效规则
export const getPerformanceRules = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.performanceRule.findMany({
      orderBy: [
        { competitionLevel: 'asc' },
        { awardLevel: 'asc' },
      ],
    });

    return successResponse(res, rules);
  } catch (error) {
    next(error);
  }
};

// 更新绩效规则
export const updatePerformanceRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      throw new BadRequestError('rules必须是数组');
    }

    // 批量更新或创建规则
    await prisma.$transaction(
      rules.map((rule: any) =>
        prisma.performanceRule.upsert({
          where: {
            competitionLevel_awardLevel: {
              competitionLevel: rule.competitionLevel as CompetitionLevel,
              awardLevel: rule.awardLevel as AwardLevel,
            },
          },
          update: {
            performanceScore: rule.performanceScore,
            workload: rule.workload,
          },
          create: {
            competitionLevel: rule.competitionLevel as CompetitionLevel,
            awardLevel: rule.awardLevel as AwardLevel,
            performanceScore: rule.performanceScore,
            workload: rule.workload,
          },
        })
      )
    );

    const updatedRules = await prisma.performanceRule.findMany({
      orderBy: [
        { competitionLevel: 'asc' },
        { awardLevel: 'asc' },
      ],
    });

    return successResponse(res, updatedRules, '绩效规则更新成功');
  } catch (error) {
    next(error);
  }
};

// 获取我的绩效
export const getMyPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        employeeId: true,
        performanceScore: true,
        monthlyEditCount: true,
        lastEditMonth: true,
      },
    });

    // 获取获奖记录明细
    const awards = await prisma.award.findMany({
      where: {
        status: 'APPROVED',
        application: {
          OR: [
            { teacherId: userId },
            { coTeacherId: userId },
          ],
        },
      },
      include: {
        application: {
          include: {
            competition: true,
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
    });

    // 统计绩效
    const performanceDetails = awards.map(award => ({
      id: award.id,
      competitionName: award.application.competition.name,
      competitionLevel: award.application.competition.level,
      awardLevel: award.awardLevel,
      performanceScore: award.performanceScore,
      workload: award.workload,
      approvedAt: award.approvedAt,
    }));

    // 按竞赛等级统计
    const statsByLevel = awards.reduce((acc: any, award) => {
      const level = award.application.competition.level;
      if (!acc[level]) {
        acc[level] = { count: 0, totalScore: 0, totalWorkload: 0 };
      }
      acc[level].count += 1;
      acc[level].totalScore += Number(award.performanceScore);
      acc[level].totalWorkload += Number(award.workload);
      return acc;
    }, {});

    // 信息修改记录
    const editLogs = await prisma.userInfoEditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return successResponse(res, {
      user,
      totalPerformanceScore: user?.performanceScore || 0,
      totalAwards: awards.length,
      performanceDetails,
      statsByLevel,
      editLogs,
    });
  } catch (error) {
    next(error);
  }
};

// 获取院级绩效统计
export const getDepartmentPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const departmentId = user.role === 'DEPARTMENT_ADMIN' ? user.departmentId : parseInt(req.query.departmentId as string);

    if (!departmentId) {
      throw new BadRequestError('请指定学院');
    }

    // 获取本院教师绩效排名
    const [teachers, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          departmentId,
          role: 'TEACHER',
        },
        select: {
          id: true,
          name: true,
          employeeId: true,
          performanceScore: true,
          _count: {
            select: {
              applications: {
                where: { status: 'APPROVED' },
              },
            },
          },
        },
        orderBy: { performanceScore: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({
        where: { departmentId, role: 'TEACHER' },
      }),
    ]);

    // 院级统计数据
    const departmentStats = await prisma.award.aggregate({
      where: {
        status: 'APPROVED',
        application: {
          teacher: { departmentId },
        },
      },
      _sum: {
        performanceScore: true,
        workload: true,
        rewardAmount: true,
      },
      _count: true,
    });

    // 按竞赛等级统计
    const awardsByLevel = await prisma.award.groupBy({
      by: ['awardLevel'],
      where: {
        status: 'APPROVED',
        application: {
          teacher: { departmentId },
        },
      },
      _count: true,
    });

    return paginatedResponse(res, teachers, page, pageSize, total, '查询成功');
  } catch (error) {
    next(error);
  }
};

// 获取校级绩效统计
export const getSchoolPerformance = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 全校绩效总览
    const totalStats = await prisma.award.aggregate({
      where: { status: 'APPROVED' },
      _sum: {
        performanceScore: true,
        workload: true,
        rewardAmount: true,
      },
      _count: true,
    });

    // 按学院统计
    const departments = await prisma.department.findMany({
      include: {
        users: {
          where: { role: 'TEACHER' },
          select: {
            id: true,
            performanceScore: true,
          },
        },
      },
    });

    const departmentStats = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      teacherCount: dept.users.length,
      totalPerformance: dept.users.reduce((sum, u) => sum + Number(u.performanceScore), 0),
      avgPerformance: dept.users.length > 0
        ? dept.users.reduce((sum, u) => sum + Number(u.performanceScore), 0) / dept.users.length
        : 0,
    }));

    // 按竞赛等级统计
    const awardsByCompetitionLevel = await prisma.award.findMany({
      where: { status: 'APPROVED' },
      include: {
        application: {
          include: { competition: true },
        },
      },
    });

    const levelStats = awardsByCompetitionLevel.reduce((acc: any, award) => {
      const level = award.application.competition.level;
      if (!acc[level]) {
        acc[level] = { count: 0, totalScore: 0 };
      }
      acc[level].count += 1;
      acc[level].totalScore += Number(award.performanceScore);
      return acc;
    }, {});

    return successResponse(res, {
      totalStats: {
        totalAwards: totalStats._count,
        totalPerformance: totalStats._sum.performanceScore || 0,
        totalWorkload: totalStats._sum.workload || 0,
        totalReward: totalStats._sum.rewardAmount || 0,
      },
      departmentStats: departmentStats.sort((a, b) => b.totalPerformance - a.totalPerformance),
      levelStats,
    });
  } catch (error) {
    next(error);
  }
};
