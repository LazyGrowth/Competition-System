import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AwardLevel, AwardStatus, ApprovalAction } from '@prisma/client';
import { validationResult } from 'express-validator';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { successResponse, paginatedResponse, createdResponse, errorResponse } from '../utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获奖等级映射
const awardLevelMap: { [key: string]: AwardLevel } = {
  '特等奖': 'SPECIAL_PRIZE',
  '一等奖': 'FIRST_PRIZE',
  '二等奖': 'SECOND_PRIZE',
  '三等奖': 'THIRD_PRIZE',
  '优秀奖': 'EXCELLENCE',
};

// 获取最新获奖信息（公开接口）
export const getLatestAwards = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const awards = await prisma.award.findMany({
      where: { status: 'APPROVED' },
      include: {
        application: {
          include: {
            competition: true,
            teacher: { select: { id: true, name: true } },
            coTeacher: { select: { id: true, name: true } },
            students: { include: { student: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
      take: 20,
    });

    return successResponse(res, awards);
  } catch (error) {
    next(error);
  }
};

// 获取我的获奖记录
export const getMyAwards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { level, status } = req.query;

    const where: any = {
      application: {
        OR: [
          { teacherId: userId },
          { coTeacherId: userId },
        ],
      },
    };

    if (level) {
      where.awardLevel = awardLevelMap[level as string];
    }
    if (status) {
      where.status = status as AwardStatus;
    }

    const [awards, total] = await Promise.all([
      prisma.award.findMany({
        where,
        include: {
          application: {
            include: {
              competition: true,
              teacher: { select: { id: true, name: true, employeeId: true } },
              students: { include: { student: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.award.count({ where }),
    ]);

    return paginatedResponse(res, awards, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取所有获奖记录（管理员）
export const getAwards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { level, status, competitionLevel, departmentId } = req.query;
    const user = req.user;

    const where: any = {};

    // 院级管理员只能看到本院的获奖记录
    if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      where.application = { teacher: { departmentId: user.departmentId } };
    }

    if (level) {
      where.awardLevel = awardLevelMap[level as string];
    }
    if (status) {
      where.status = status as AwardStatus;
    }
    if (competitionLevel) {
      where.application = { ...where.application, competition: { level: competitionLevel } };
    }
    if (departmentId) {
      where.application = { ...where.application, teacher: { departmentId: parseInt(departmentId as string) } };
    }

    const [awards, total] = await Promise.all([
      prisma.award.findMany({
        where,
        include: {
          application: {
            include: {
              competition: true,
              teacher: { select: { id: true, name: true, employeeId: true, department: true } },
              coTeacher: { select: { id: true, name: true } },
              students: { include: { student: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.award.count({ where }),
    ]);

    return paginatedResponse(res, awards, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取单个获奖详情
export const getAwardById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const award = await prisma.award.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            competition: true,
            teacher: { select: { id: true, name: true, employeeId: true, department: true } },
            coTeacher: { select: { id: true, name: true } },
            students: { include: { student: true } },
          },
        },
        approvalRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!award) {
      throw new NotFoundError('获奖记录不存在');
    }

    return successResponse(res, award);
  } catch (error) {
    next(error);
  }
};

// 创建获奖记录（教师上传总结）
export const createAward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, '验证失败', 400, errors.array());
    }

    const userId = req.userId!;
    const { applicationId, awardLevel, certificateNo } = req.body;
    const summaryPdf = req.file?.path;

    // 检查申报是否存在且已通过
    const application = await prisma.application.findUnique({
      where: { id: parseInt(applicationId) },
      include: { competition: true, award: true },
    });

    if (!application) {
      throw new NotFoundError('申报不存在');
    }

    if (application.status !== 'APPROVED') {
      throw new BadRequestError('申报未通过审批');
    }

    if (application.teacherId !== userId && application.coTeacherId !== userId) {
      throw new ForbiddenError('无权为此申报提交获奖记录');
    }

    if (application.award) {
      throw new BadRequestError('该申报已有获奖记录');
    }

    // 检查证书编号唯一性
    const existingCertificate = await prisma.award.findUnique({
      where: { certificateNo },
    });

    if (existingCertificate) {
      throw new BadRequestError('证书编号已存在');
    }

    // 查询绩效和奖励规则
    const [performanceRule, rewardRule] = await Promise.all([
      prisma.performanceRule.findUnique({
        where: {
          competitionLevel_awardLevel: {
            competitionLevel: application.competition.level,
            awardLevel: awardLevelMap[awardLevel],
          },
        },
      }),
      prisma.rewardRule.findUnique({
        where: {
          competitionLevel_awardLevel: {
            competitionLevel: application.competition.level,
            awardLevel: awardLevelMap[awardLevel],
          },
        },
      }),
    ]);

    // 创建获奖记录
    const award = await prisma.award.create({
      data: {
        applicationId: parseInt(applicationId),
        awardLevel: awardLevelMap[awardLevel],
        certificateNo,
        summaryPdf,
        performanceScore: performanceRule?.performanceScore || 0,
        workload: performanceRule?.workload || 0,
        rewardAmount: rewardRule?.rewardAmount || 0,
        status: 'PENDING_DEPARTMENT',
      },
      include: {
        application: {
          include: {
            competition: true,
            teacher: { select: { id: true, name: true } },
          },
        },
      },
    });

    return createdResponse(res, award, '获奖记录已提交，等待审核');
  } catch (error) {
    next(error);
  }
};

// 审批获奖记录
export const approveAward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;
    const user = req.user;
    const { action, comment } = req.body;

    const award = await prisma.award.findUnique({
      where: { id },
      include: {
        application: {
          include: { teacher: true, competition: true },
        },
      },
    });

    if (!award) {
      throw new NotFoundError('获奖记录不存在');
    }

    let newStatus: AwardStatus;
    let canApprove = false;

    if (user.role === 'DEPARTMENT_ADMIN') {
      if (award.status !== 'PENDING_DEPARTMENT') {
        throw new BadRequestError('该获奖记录不在院级审批阶段');
      }
      if (user.departmentId && award.application.teacher.departmentId !== user.departmentId) {
        throw new ForbiddenError('无权审批其他院系的获奖记录');
      }
      canApprove = true;

      if (action === 'APPROVE') {
        newStatus = 'PENDING_SCHOOL';
      } else {
        newStatus = 'REJECTED';
      }
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
      if (award.status !== 'PENDING_SCHOOL') {
        throw new BadRequestError('该获奖记录不在校级审批阶段');
      }
      canApprove = true;

      if (action === 'APPROVE') {
        newStatus = 'APPROVED';
      } else {
        newStatus = 'REJECTED';
      }
    }

    if (!canApprove) {
      throw new ForbiddenError('无审批权限');
    }

    // 执行审批
    await prisma.$transaction(async (tx) => {
      // 更新获奖状态
      await tx.award.update({
        where: { id },
        data: {
          status: newStatus!,
          approvedAt: newStatus === 'APPROVED' ? new Date() : null,
        },
      });

      // 创建审批记录
      await tx.awardApprovalRecord.create({
        data: {
          awardId: id,
          approverId: userId,
          action: action as ApprovalAction,
          comment,
        },
      });

      // 如果通过校级审核，更新教师绩效
      if (newStatus === 'APPROVED') {
        await tx.user.update({
          where: { id: award.application.teacherId },
          data: {
            performanceScore: { increment: Number(award.performanceScore) },
          },
        });

        // 如果有第二指导教师，也更新其绩效（按比例分配）
        if (award.application.coTeacherId) {
          await tx.user.update({
            where: { id: award.application.coTeacherId },
            data: {
              performanceScore: { increment: Number(award.performanceScore) * 0.5 },
            },
          });
        }
      }
    });

    const updatedAward = await prisma.award.findUnique({
      where: { id },
      include: { application: { include: { competition: true } } },
    });

    return successResponse(res, updatedAward, `审批${action === 'APPROVE' ? '通过' : '驳回'}成功`);
  } catch (error) {
    next(error);
  }
};

// 导出获奖证书PDF（带水印）
export const exportAwardPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;
    const user = req.user;

    const award = await prisma.award.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            competition: true,
            teacher: { include: { department: true } },
            coTeacher: true,
            students: { include: { student: true } },
          },
        },
      },
    });

    if (!award) {
      throw new NotFoundError('获奖记录不存在');
    }

    // 权限检查：教师只能下载自己的，管理员可以下载本院或所有
    const isOwner = award.application.teacherId === userId || award.application.coTeacherId === userId;
    const isDeptAdmin = user.role === 'DEPARTMENT_ADMIN' && user.departmentId === award.application.teacher.departmentId;
    const isSchoolAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isOwner && !isDeptAdmin && !isSchoolAdmin) {
      throw new ForbiddenError('无权导出此获奖记录');
    }

    let pdfDoc: PDFDocument;
    let font: any;

    if (award.summaryPdf) {
      // 如果有上传的PDF，读取并添加水印
      const pdfPath = path.resolve(award.summaryPdf);
      if (fs.existsSync(pdfPath)) {
        const existingPdfBytes = fs.readFileSync(pdfPath);
        pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      } else {
        // 文件不存在，创建新PDF
        pdfDoc = await PDFDocument.create();
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        await createAwardCertificatePage(pdfDoc, font, award);
      }
    } else {
      // 没有上传的PDF，创建新的证书PDF
      pdfDoc = await PDFDocument.create();
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      await createAwardCertificatePage(pdfDoc, font, award);
    }

    const pages = pdfDoc.getPages();

    // 添加水印到每一页
    for (const page of pages) {
      const { width, height } = page.getSize();
      const watermarkText = `No: ${award.certificateNo}`;
      
      // 添加多个水印形成网格效果
      for (let y = 100; y < height; y += 200) {
        for (let x = 50; x < width; x += 250) {
          page.drawText(watermarkText, {
            x,
            y,
            size: 16,
            font,
            color: rgb(0.8, 0.8, 0.8),
            opacity: 0.2,
            rotate: { type: 'degrees' as const, angle: 45 },
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    // 处理文件名，避免中文乱码
    const safeFilename = `award_${award.certificateNo.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    next(error);
  }
};

// 创建获奖证书页面
async function createAwardCertificatePage(pdfDoc: PDFDocument, font: any, award: any) {
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  // 获奖等级中英文映射
  const awardLevelText: { [key: string]: string } = {
    'SPECIAL_PRIZE': 'Special Prize',
    'FIRST_PRIZE': 'First Prize',
    'SECOND_PRIZE': 'Second Prize',
    'THIRD_PRIZE': 'Third Prize',
    'EXCELLENCE': 'Excellence Award',
  };

  const awardLevelChinese: { [key: string]: string } = {
    'SPECIAL_PRIZE': '特等奖',
    'FIRST_PRIZE': '一等奖',
    'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖',
    'EXCELLENCE': '优秀奖',
  };

  // 绘制边框
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: rgb(0.6, 0.7, 0.9),
    borderWidth: 1,
  });

  let yPosition = height - 100;

  // 标题
  page.drawText('CERTIFICATE OF AWARD', {
    x: width / 2 - 130,
    y: yPosition,
    size: 24,
    font,
    color: rgb(0.1, 0.3, 0.6),
  });

  yPosition -= 50;
  
  // 竞赛名称
  page.drawText(`Competition: ${award.application.competition.name}`, {
    x: 60,
    y: yPosition,
    size: 14,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  yPosition -= 30;
  
  // 年份
  page.drawText(`Year: ${award.application.competition.year || new Date().getFullYear()}`, {
    x: 60,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPosition -= 50;
  
  // 教师信息
  page.drawText('Instructor:', {
    x: 60,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  yPosition -= 25;
  
  page.drawText(`${award.application.teacher.name} (${award.application.teacher.employeeId})`, {
    x: 80,
    y: yPosition,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  if (award.application.coTeacher) {
    yPosition -= 25;
    page.drawText(`${award.application.coTeacher.name} (Co-instructor)`, {
      x: 80,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  yPosition -= 40;
  
  // 学生信息
  if (award.application.students && award.application.students.length > 0) {
    page.drawText('Students:', {
      x: 60,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 25;
    const studentNames = award.application.students.map((s: any) => s.student.name).join(', ');
    page.drawText(studentNames, {
      x: 80,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 40;
  }

  // 获奖等级
  page.drawText('Award Level:', {
    x: 60,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  yPosition -= 30;
  
  page.drawText(awardLevelText[award.awardLevel] || award.awardLevel, {
    x: 80,
    y: yPosition,
    size: 20,
    font,
    color: rgb(0.8, 0.5, 0.1),
  });

  yPosition -= 50;
  
  // 证书编号
  page.drawText(`Certificate No: ${award.certificateNo}`, {
    x: 60,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPosition -= 25;
  
  // 获奖日期
  const approvedDate = award.approvedAt ? new Date(award.approvedAt).toLocaleDateString() : new Date().toLocaleDateString();
  page.drawText(`Date: ${approvedDate}`, {
    x: 60,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 底部说明
  page.drawText('This certificate is generated by Competition Management System', {
    x: width / 2 - 180,
    y: 80,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return page;
}

// 批量导出获奖证书PDF（管理员）
export const batchExportAwardPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { awardIds } = req.body;
    const user = req.user;

    if (!awardIds || !Array.isArray(awardIds) || awardIds.length === 0) {
      throw new BadRequestError('请选择要导出的获奖记录');
    }

    if (awardIds.length > 50) {
      throw new BadRequestError('一次最多导出50条记录');
    }

    const where: any = {
      id: { in: awardIds.map((id: any) => parseInt(id)) },
    };

    // 院级管理员只能导出本院的
    if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      where.application = { teacher: { departmentId: user.departmentId } };
    }

    const awards = await prisma.award.findMany({
      where,
      include: {
        application: {
          include: {
            competition: true,
            teacher: { include: { department: true } },
            coTeacher: true,
            students: { include: { student: true } },
          },
        },
      },
    });

    if (awards.length === 0) {
      throw new NotFoundError('未找到符合条件的获奖记录');
    }

    // 创建合并的PDF
    const mergedPdf = await PDFDocument.create();
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

    for (const award of awards) {
      let sourcePdf: PDFDocument;

      if (award.summaryPdf) {
        const pdfPath = path.resolve(award.summaryPdf);
        if (fs.existsSync(pdfPath)) {
          const existingPdfBytes = fs.readFileSync(pdfPath);
          sourcePdf = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        } else {
          sourcePdf = await PDFDocument.create();
          await createAwardCertificatePage(sourcePdf, font, award);
        }
      } else {
        sourcePdf = await PDFDocument.create();
        await createAwardCertificatePage(sourcePdf, font, award);
      }

      // 添加水印
      const pages = sourcePdf.getPages();
      const sourceFont = await sourcePdf.embedFont(StandardFonts.Helvetica);
      
      for (const page of pages) {
        const { width, height } = page.getSize();
        const watermarkText = `No: ${award.certificateNo}`;
        
        for (let y = 100; y < height; y += 200) {
          for (let x = 50; x < width; x += 250) {
            page.drawText(watermarkText, {
              x,
              y,
              size: 16,
              font: sourceFont,
              color: rgb(0.8, 0.8, 0.8),
              opacity: 0.2,
              rotate: { type: 'degrees' as const, angle: 45 },
            });
          }
        }
      }

      // 复制页面到合并的PDF
      const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `awards_batch_${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    next(error);
  }
};
