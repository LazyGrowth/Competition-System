import { Request, Response, NextFunction } from 'express';
import { PrismaClient, CompetitionLevel, AwardLevel } from '@prisma/client';
import ExcelJS from 'exceljs';
import { successResponse } from '../utils/response';
import { BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获取奖励规则
export const getRewardRules = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.rewardRule.findMany({
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

// 更新奖励规则
export const updateRewardRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      throw new BadRequestError('rules必须是数组');
    }

    await prisma.$transaction(
      rules.map((rule: any) =>
        prisma.rewardRule.upsert({
          where: {
            competitionLevel_awardLevel: {
              competitionLevel: rule.competitionLevel as CompetitionLevel,
              awardLevel: rule.awardLevel as AwardLevel,
            },
          },
          update: {
            rewardAmount: rule.rewardAmount,
          },
          create: {
            competitionLevel: rule.competitionLevel as CompetitionLevel,
            awardLevel: rule.awardLevel as AwardLevel,
            rewardAmount: rule.rewardAmount,
          },
        })
      )
    );

    const updatedRules = await prisma.rewardRule.findMany({
      orderBy: [
        { competitionLevel: 'asc' },
        { awardLevel: 'asc' },
      ],
    });

    return successResponse(res, updatedRules, '奖励规则更新成功');
  } catch (error) {
    next(error);
  }
};

// 获取年度奖励统计
export const getAnnualRewards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    // 获取该年度所有已审核通过的获奖记录
    const awards = await prisma.award.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: {
          gte: new Date(`${targetYear}-01-01`),
          lt: new Date(`${targetYear + 1}-01-01`),
        },
      },
      include: {
        application: {
          include: {
            competition: true,
            teacher: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                bankAccount: true,
                bankName: true,
                department: true,
              },
            },
            coTeacher: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                bankAccount: true,
                bankName: true,
              },
            },
          },
        },
      },
      orderBy: { approvedAt: 'asc' },
    });

    // 按教师汇总奖励
    const teacherRewards: { [key: number]: any } = {};

    awards.forEach(award => {
      const teacher = award.application.teacher;
      const coTeacher = award.application.coTeacher;
      const rewardAmount = Number(award.rewardAmount);

      // 主指导教师
      if (!teacherRewards[teacher.id]) {
        teacherRewards[teacher.id] = {
          teacher,
          totalReward: 0,
          awards: [],
        };
      }
      teacherRewards[teacher.id].totalReward += rewardAmount;
      teacherRewards[teacher.id].awards.push({
        awardId: award.id,
        competitionName: award.application.competition.name,
        competitionLevel: award.application.competition.level,
        awardLevel: award.awardLevel,
        rewardAmount,
        approvedAt: award.approvedAt,
      });

      // 第二指导教师（按50%计算）
      if (coTeacher) {
        if (!teacherRewards[coTeacher.id]) {
          teacherRewards[coTeacher.id] = {
            teacher: coTeacher,
            totalReward: 0,
            awards: [],
          };
        }
        teacherRewards[coTeacher.id].totalReward += rewardAmount * 0.5;
        teacherRewards[coTeacher.id].awards.push({
          awardId: award.id,
          competitionName: award.application.competition.name,
          competitionLevel: award.application.competition.level,
          awardLevel: award.awardLevel,
          rewardAmount: rewardAmount * 0.5,
          approvedAt: award.approvedAt,
          isCoTeacher: true,
        });
      }
    });

    // 转换为数组并按奖励金额排序
    const rewardList = Object.values(teacherRewards).sort(
      (a: any, b: any) => b.totalReward - a.totalReward
    );

    // 统计总金额
    const totalReward = rewardList.reduce((sum: number, item: any) => sum + item.totalReward, 0);

    return successResponse(res, {
      year: targetYear,
      totalReward,
      teacherCount: rewardList.length,
      awardCount: awards.length,
      rewardList,
    });
  } catch (error) {
    next(error);
  }
};

// 导出年度奖励报表
export const exportAnnualRewards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    // 获取年度奖励数据
    const awards = await prisma.award.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: {
          gte: new Date(`${targetYear}-01-01`),
          lt: new Date(`${targetYear + 1}-01-01`),
        },
      },
      include: {
        application: {
          include: {
            competition: true,
            teacher: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                bankAccount: true,
                bankName: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: { approvedAt: 'asc' },
    });

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '竞赛管理系统';
    workbook.created = new Date();

    // 创建奖励明细表
    const detailSheet = workbook.addWorksheet('奖励明细');
    detailSheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '教师工号', key: 'employeeId', width: 15 },
      { header: '教师姓名', key: 'teacherName', width: 12 },
      { header: '学院', key: 'department', width: 20 },
      { header: '竞赛名称', key: 'competitionName', width: 30 },
      { header: '竞赛等级', key: 'competitionLevel', width: 10 },
      { header: '获奖等级', key: 'awardLevel', width: 10 },
      { header: '奖励金额', key: 'rewardAmount', width: 12 },
      { header: '银行卡号', key: 'bankAccount', width: 25 },
      { header: '开户行', key: 'bankName', width: 25 },
      { header: '审核日期', key: 'approvedAt', width: 15 },
    ];

    const awardLevelNames: { [key: string]: string } = {
      'SPECIAL_PRIZE': '特等奖',
      'FIRST_PRIZE': '一等奖',
      'SECOND_PRIZE': '二等奖',
      'THIRD_PRIZE': '三等奖',
      'EXCELLENCE': '优秀奖',
    };

    awards.forEach((award, index) => {
      detailSheet.addRow({
        index: index + 1,
        employeeId: award.application.teacher.employeeId,
        teacherName: award.application.teacher.name,
        department: award.application.teacher.department?.name || '',
        competitionName: award.application.competition.name,
        competitionLevel: award.application.competition.level,
        awardLevel: awardLevelNames[award.awardLevel] || award.awardLevel,
        rewardAmount: Number(award.rewardAmount),
        bankAccount: award.application.teacher.bankAccount || '',
        bankName: award.application.teacher.bankName || '',
        approvedAt: award.approvedAt?.toISOString().split('T')[0] || '',
      });
    });

    // 设置表头样式
    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=annual_rewards_${targetYear}.xlsx`
    );

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
