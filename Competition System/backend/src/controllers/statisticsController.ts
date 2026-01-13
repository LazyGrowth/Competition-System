import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { successResponse } from '../utils/response';

const prisma = new PrismaClient();

// 获取总览统计
export const getOverviewStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    const applicationWhere: any = {};
    const awardWhere: any = { status: 'APPROVED' };

    if (Object.keys(dateFilter).length > 0) {
      applicationWhere.submittedAt = dateFilter;
      awardWhere.approvedAt = dateFilter;
    }

    // 教师只统计自己的数据
    if (user.role === 'TEACHER') {
      applicationWhere.teacherId = user.id;
      awardWhere.application = { teacherId: user.id };
    }
    // 院级管理员只统计本院数据
    else if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      applicationWhere.teacher = { departmentId: user.departmentId };
      awardWhere.application = { teacher: { departmentId: user.departmentId } };
    }

    // 竞赛按年份筛选
    const competitionWhere: any = {};
    if (startDate) {
      const year = new Date(startDate as string).getFullYear();
      competitionWhere.year = year;
    }

    // 统计数据
    const [
      totalCompetitions,
      totalApplications,
      approvedApplications,
      totalAwards,
      totalTeachers,
      totalStudents,
    ] = await Promise.all([
      prisma.competition.count({ where: competitionWhere }),
      prisma.application.count({ where: applicationWhere }),
      prisma.application.count({ where: { ...applicationWhere, status: 'APPROVED' } }),
      prisma.award.count({ where: awardWhere }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.student.count(),
    ]);

    // 绩效统计
    const performanceStats = await prisma.award.aggregate({
      where: awardWhere,
      _sum: {
        performanceScore: true,
        workload: true,
        rewardAmount: true,
      },
    });

    return successResponse(res, {
      totalCompetitions,
      totalApplications,
      approvedApplications,
      totalAwards,
      totalTeachers,
      totalStudents,
      totalPerformance: performanceStats._sum.performanceScore || 0,
      totalWorkload: performanceStats._sum.workload || 0,
      totalReward: performanceStats._sum.rewardAmount || 0,
    });
  } catch (error) {
    next(error);
  }
};

// 获取竞赛统计
export const getCompetitionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const user = req.user;

    const where: any = {};
    if (year) {
      where.year = parseInt(year as string);
    }

    // 按等级统计竞赛数量
    const competitionsByLevel = await prisma.competition.groupBy({
      by: ['level'],
      where,
      _count: true,
    });

    // 按区域统计
    const competitionsByRegion = await prisma.competition.groupBy({
      by: ['region'],
      where,
      _count: true,
    });

    // 按年份统计
    const competitionsByYear = await prisma.competition.groupBy({
      by: ['year'],
      _count: true,
      orderBy: { year: 'desc' },
      take: 5,
    });

    // 获奖统计（根据角色过滤）
    const awardWhere: any = { status: 'APPROVED' };
    if (user.role === 'TEACHER') {
      // 教师只能看到自己的获奖统计
      awardWhere.application = {
        OR: [
          { teacherId: user.id },
          { coTeacherId: user.id },
        ],
      };
    } else if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      // 院级管理员只能看到本院的获奖统计
      awardWhere.application = { teacher: { departmentId: user.departmentId } };
    }

    const awardsByLevel = await prisma.award.groupBy({
      by: ['awardLevel'],
      where: awardWhere,
      _count: true,
    });

    return successResponse(res, {
      competitionsByLevel,
      competitionsByRegion,
      competitionsByYear,
      awardsByLevel,
    });
  } catch (error) {
    next(error);
  }
};

// 获取学院对比统计
export const getDepartmentComparison = async (_req: Request, res: Response, next: NextFunction) => {
  try {
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

    // 获取各学院的申报和获奖数据
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const [applicationCount, awardCount, awardSum] = await Promise.all([
          prisma.application.count({
            where: { teacher: { departmentId: dept.id } },
          }),
          prisma.award.count({
            where: {
              status: 'APPROVED',
              application: { teacher: { departmentId: dept.id } },
            },
          }),
          prisma.award.aggregate({
            where: {
              status: 'APPROVED',
              application: { teacher: { departmentId: dept.id } },
            },
            _sum: {
              performanceScore: true,
              rewardAmount: true,
            },
          }),
        ]);

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          teacherCount: dept.users.length,
          applicationCount,
          awardCount,
          totalPerformance: awardSum._sum.performanceScore || 0,
          totalReward: awardSum._sum.rewardAmount || 0,
          avgPerformance: dept.users.length > 0
            ? dept.users.reduce((sum, u) => sum + Number(u.performanceScore), 0) / dept.users.length
            : 0,
        };
      })
    );

    return successResponse(res, departmentStats.sort((a, b) => Number(b.totalPerformance) - Number(a.totalPerformance)));
  } catch (error) {
    next(error);
  }
};

// 获取教师排名
export const getTeacherRanking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 20, departmentId } = req.query;
    const user = req.user;

    const where: any = { role: 'TEACHER' };

    // 院级管理员只能看到本院教师
    if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      where.departmentId = user.departmentId;
    } else if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }

    const teachers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        employeeId: true,
        performanceScore: true,
        department: true,
        _count: {
          select: {
            applications: {
              where: { status: 'APPROVED' },
            },
          },
        },
      },
      orderBy: { performanceScore: 'desc' },
      take: parseInt(limit as string),
    });

    // 添加排名
    const ranking = teachers.map((teacher, index) => ({
      rank: index + 1,
      ...teacher,
      applicationCount: teacher._count.applications,
    }));

    return successResponse(res, ranking);
  } catch (error) {
    next(error);
  }
};

// 导出统计报表
export const exportStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'all', year, semester } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    // 学期筛选
    let startDate: Date, endDate: Date;
    if (semester === 'spring') {
      startDate = new Date(`${targetYear}-02-01`);
      endDate = new Date(`${targetYear}-07-31`);
    } else if (semester === 'autumn') {
      startDate = new Date(`${targetYear}-08-01`);
      endDate = new Date(`${targetYear + 1}-01-31`);
    } else {
      startDate = new Date(`${targetYear}-01-01`);
      endDate = new Date(`${targetYear + 1}-01-01`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '竞赛管理系统';
    workbook.created = new Date();

    if (type === 'overview' || type === 'all') {
      // 总览统计表
      const overviewSheet = workbook.addWorksheet('总览统计');
      
      const [totalCompetitions, totalApplications, totalAwards, totalStudents, totalTeachers] = await Promise.all([
        prisma.competition.count({ where: { year: targetYear } }),
        prisma.application.count({
          where: {
            submittedAt: { gte: startDate, lt: endDate },
          },
        }),
        prisma.award.count({
          where: {
            status: 'APPROVED',
            approvedAt: { gte: startDate, lt: endDate },
          },
        }),
        prisma.student.count(),
        prisma.user.count({ where: { role: 'TEACHER' } }),
      ]);

      const performanceSum = await prisma.award.aggregate({
        where: {
          status: 'APPROVED',
          approvedAt: { gte: startDate, lt: endDate },
        },
        _sum: { performanceScore: true, workload: true, rewardAmount: true },
      });

      overviewSheet.columns = [
        { header: '统计项', key: 'item', width: 25 },
        { header: '数值', key: 'value', width: 20 },
      ];

      overviewSheet.addRows([
        { item: '统计年度', value: targetYear },
        { item: '统计学期', value: semester === 'spring' ? '春季学期' : semester === 'autumn' ? '秋季学期' : '全年' },
        { item: '竞赛总数', value: totalCompetitions },
        { item: '申报总数', value: totalApplications },
        { item: '获奖总数', value: totalAwards },
        { item: '参赛学生数', value: totalStudents },
        { item: '指导教师数', value: totalTeachers },
        { item: '总绩效分', value: Number(performanceSum._sum.performanceScore || 0) },
        { item: '总工作量（学时）', value: Number(performanceSum._sum.workload || 0) },
        { item: '总奖励金额（元）', value: Number(performanceSum._sum.rewardAmount || 0) },
      ]);
    }

    if (type === 'department' || type === 'all') {
      // 学院对比表
      const deptSheet = workbook.addWorksheet('学院对比');
      
      const departments = await prisma.department.findMany({
        include: {
          users: {
            where: { role: 'TEACHER' },
            select: { id: true, performanceScore: true },
          },
        },
      });

      deptSheet.columns = [
        { header: '学院名称', key: 'name', width: 25 },
        { header: '学院代码', key: 'code', width: 12 },
        { header: '教师人数', key: 'teacherCount', width: 12 },
        { header: '申报数', key: 'applicationCount', width: 12 },
        { header: '获奖数', key: 'awardCount', width: 12 },
        { header: '总绩效分', key: 'totalPerformance', width: 12 },
        { header: '平均绩效', key: 'avgPerformance', width: 12 },
        { header: '总奖励（元）', key: 'totalReward', width: 15 },
      ];

      for (const dept of departments) {
        const [appCount, awardCount, awardSum] = await Promise.all([
          prisma.application.count({ where: { teacher: { departmentId: dept.id } } }),
          prisma.award.count({ where: { status: 'APPROVED', application: { teacher: { departmentId: dept.id } } } }),
          prisma.award.aggregate({
            where: { status: 'APPROVED', application: { teacher: { departmentId: dept.id } } },
            _sum: { performanceScore: true, rewardAmount: true },
          }),
        ]);

        const total = dept.users.reduce((sum, u) => sum + Number(u.performanceScore), 0);
        deptSheet.addRow({
          name: dept.name,
          code: dept.code,
          teacherCount: dept.users.length,
          applicationCount: appCount,
          awardCount: awardCount,
          totalPerformance: total,
          avgPerformance: dept.users.length > 0 ? (total / dept.users.length).toFixed(2) : 0,
          totalReward: Number(awardSum._sum.rewardAmount || 0),
        });
      }
    }

    if (type === 'teacher' || type === 'all') {
      // 教师排名表
      const teacherSheet = workbook.addWorksheet('教师绩效排名');
      
      const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        include: {
          department: true,
          applications: {
            where: { status: 'APPROVED' },
            include: { award: { where: { status: 'APPROVED' } } },
          },
        },
        orderBy: { performanceScore: 'desc' },
      });

      teacherSheet.columns = [
        { header: '排名', key: 'rank', width: 8 },
        { header: '工号', key: 'employeeId', width: 15 },
        { header: '姓名', key: 'name', width: 12 },
        { header: '学院', key: 'department', width: 25 },
        { header: '绩效分', key: 'performance', width: 12 },
        { header: '获奖数', key: 'awardCount', width: 10 },
        { header: '奖励金额', key: 'reward', width: 12 },
      ];

      teachers.forEach((teacher, index) => {
        const awardCount = teacher.applications.filter(a => a.award).length;
        const totalReward = teacher.applications.reduce((sum, a) => sum + Number(a.award?.rewardAmount || 0), 0);
        
        teacherSheet.addRow({
          rank: index + 1,
          employeeId: teacher.employeeId,
          name: teacher.name,
          department: teacher.department?.name || '-',
          performance: Number(teacher.performanceScore),
          awardCount,
          reward: totalReward,
        });
      });
    }

    if (type === 'award' || type === 'all') {
      // 获奖详细表
      const awardSheet = workbook.addWorksheet('获奖记录');
      
      const awards = await prisma.award.findMany({
        where: {
          status: 'APPROVED',
          approvedAt: { gte: startDate, lt: endDate },
        },
        include: {
          application: {
            include: {
              competition: true,
              teacher: { include: { department: true } },
              students: { include: { student: true } },
            },
          },
        },
        orderBy: { approvedAt: 'desc' },
      });

      const awardLevelMap: Record<string, string> = {
        'SPECIAL_PRIZE': '特等奖', 'FIRST_PRIZE': '一等奖', 'SECOND_PRIZE': '二等奖',
        'THIRD_PRIZE': '三等奖', 'EXCELLENCE': '优秀奖',
      };

      awardSheet.columns = [
        { header: '证书编号', key: 'certificateNo', width: 15 },
        { header: '竞赛名称', key: 'competition', width: 30 },
        { header: '竞赛等级', key: 'level', width: 10 },
        { header: '获奖等级', key: 'awardLevel', width: 10 },
        { header: '指导教师', key: 'teacher', width: 12 },
        { header: '教师工号', key: 'teacherId', width: 15 },
        { header: '学院', key: 'department', width: 20 },
        { header: '参赛学生', key: 'students', width: 25 },
        { header: '绩效分', key: 'performance', width: 10 },
        { header: '奖励金额', key: 'reward', width: 12 },
        { header: '获奖日期', key: 'date', width: 12 },
      ];

      awards.forEach(award => {
        awardSheet.addRow({
          certificateNo: award.certificateNo,
          competition: award.application.competition.name,
          level: award.application.competition.level + '级',
          awardLevel: awardLevelMap[award.awardLevel] || award.awardLevel,
          teacher: award.application.teacher.name,
          teacherId: award.application.teacher.employeeId,
          department: award.application.teacher.department?.name || '-',
          students: award.application.students.map(s => s.student.name).join(', '),
          performance: Number(award.performanceScore),
          reward: Number(award.rewardAmount),
          date: award.approvedAt?.toISOString().split('T')[0] || '-',
        });
      });
    }

    // 设置表头样式
    workbook.worksheets.forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    const semesterText = semester === 'spring' ? '_spring' : semester === 'autumn' ? '_autumn' : '';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=statistics_${targetYear}${semesterText}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// 导出教师个人获奖档案
export const exportMyAwards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    const awards = await prisma.award.findMany({
      where: {
        status: 'APPROVED',
        application: {
          OR: [{ teacherId: userId }, { coTeacherId: userId }],
        },
      },
      include: {
        application: {
          include: {
            competition: true,
            students: { include: { student: true } },
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '竞赛管理系统';
    workbook.created = new Date();

    const awardLevelMap: Record<string, string> = {
      'SPECIAL_PRIZE': '特等奖', 'FIRST_PRIZE': '一等奖', 'SECOND_PRIZE': '二等奖',
      'THIRD_PRIZE': '三等奖', 'EXCELLENCE': '优秀奖',
    };

    // 个人信息
    const infoSheet = workbook.addWorksheet('个人信息');
    infoSheet.columns = [
      { header: '项目', key: 'item', width: 15 },
      { header: '内容', key: 'value', width: 30 },
    ];
    infoSheet.addRows([
      { item: '姓名', value: user?.name },
      { item: '工号', value: user?.employeeId },
      { item: '学院', value: user?.department?.name || '-' },
      { item: '总绩效分', value: Number(user?.performanceScore || 0) },
      { item: '获奖总数', value: awards.length },
      { item: '导出时间', value: new Date().toLocaleString('zh-CN') },
    ]);

    // 获奖记录
    const awardSheet = workbook.addWorksheet('获奖记录');
    awardSheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '证书编号', key: 'certificateNo', width: 15 },
      { header: '竞赛名称', key: 'competition', width: 30 },
      { header: '竞赛等级', key: 'level', width: 10 },
      { header: '获奖等级', key: 'awardLevel', width: 10 },
      { header: '参赛学生', key: 'students', width: 25 },
      { header: '绩效分', key: 'performance', width: 10 },
      { header: '奖励金额', key: 'reward', width: 12 },
      { header: '获奖日期', key: 'date', width: 12 },
    ];

    awards.forEach((award, index) => {
      awardSheet.addRow({
        index: index + 1,
        certificateNo: award.certificateNo,
        competition: award.application.competition.name,
        level: award.application.competition.level + '级',
        awardLevel: awardLevelMap[award.awardLevel] || award.awardLevel,
        students: award.application.students.map(s => s.student.name).join(', '),
        performance: Number(award.performanceScore),
        reward: Number(award.rewardAmount),
        date: award.approvedAt?.toISOString().split('T')[0] || '-',
      });
    });

    // 设置表头样式
    workbook.worksheets.forEach(sheet => {
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=my_awards_${user?.employeeId}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
