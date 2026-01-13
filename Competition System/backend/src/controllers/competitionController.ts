import { Request, Response, NextFunction } from 'express';
import { PrismaClient, CompetitionLevel, Region } from '@prisma/client';
import { validationResult } from 'express-validator';
import ExcelJS from 'exceljs';
import fs from 'fs';
import { successResponse, paginatedResponse, createdResponse, deletedResponse, errorResponse } from '../utils/response';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// 获取竞赛列表
export const getCompetitions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { name, level, region, year, departmentId, valid } = req.query;

    // 构建查询条件
    const where: any = {};
    
    if (name) {
      where.name = { contains: name as string };
    }
    if (level) {
      where.level = level as CompetitionLevel;
    }
    if (region) {
      where.region = region as Region;
    }
    if (year) {
      where.year = parseInt(year as string);
    }
    if (departmentId) {
      where.leadDepartmentId = parseInt(departmentId as string);
    }
    // 只显示有效竞赛（未过期）
    if (valid === 'true') {
      where.OR = [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ];
    }

    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        include: { leadDepartment: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.competition.count({ where }),
    ]);

    return paginatedResponse(res, competitions, page, pageSize, total);
  } catch (error) {
    next(error);
  }
};

// 获取单个竞赛详情
export const getCompetitionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const competition = await prisma.competition.findUnique({
      where: { id },
      include: { leadDepartment: true },
    });

    if (!competition) {
      throw new NotFoundError('竞赛不存在');
    }

    return successResponse(res, competition);
  } catch (error) {
    next(error);
  }
};

// 创建竞赛
export const createCompetition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, '验证失败', 400, errors.array());
    }

    const { name, track, region, level, ranking, year, session, leadDepartmentId, validUntil, requiresFunding } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    // 检查权限：A/B类只能由校级及以上创建
    if (['A', 'B'].includes(level) && userRole === 'DEPARTMENT_ADMIN') {
      throw new ForbiddenError('A/B类竞赛只能由校级管理员导入');
    }

    // 将region字符串转换为枚举
    const regionMap: { [key: string]: Region } = {
      '国赛': 'NATIONAL',
      '省赛': 'PROVINCIAL',
      '校赛': 'SCHOOL',
    };

    const competition = await prisma.competition.create({
      data: {
        name,
        track,
        region: regionMap[region] || 'SCHOOL',
        level: level as CompetitionLevel,
        ranking: ['A', 'B'].includes(level) ? ranking : null,
        year,
        session,
        leadDepartmentId,
        validUntil: validUntil ? new Date(validUntil) : null,
        requiresFunding: requiresFunding || false,
        createdBy: userId,
      },
      include: { leadDepartment: true },
    });

    return createdResponse(res, competition, '竞赛创建成功');
  } catch (error) {
    next(error);
  }
};

// 更新竞赛
export const updateCompetition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId!;
    const updates = req.body;

    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundError('竞赛不存在');
    }

    // 记录修改日志
    const logEntries = [];
    for (const [key, newValue] of Object.entries(updates)) {
      const oldValue = (competition as any)[key];
      if (oldValue !== newValue && key !== 'updatedAt') {
        logEntries.push({
          competitionId: id,
          editorId: userId,
          fieldName: key,
          oldValue: String(oldValue),
          newValue: String(newValue),
          penaltyScore: 2, // 扣除绩效分
        });
      }
    }

    // 执行更新和记录日志
    await prisma.$transaction(async (tx) => {
      // 更新竞赛
      await tx.competition.update({
        where: { id },
        data: updates,
      });

      // 记录修改日志
      if (logEntries.length > 0) {
        await tx.competitionEditLog.createMany({ data: logEntries });

        // 扣除绩效分
        await tx.user.update({
          where: { id: userId },
          data: {
            performanceScore: { decrement: logEntries.length * 2 },
          },
        });
      }
    });

    const updatedCompetition = await prisma.competition.findUnique({
      where: { id },
      include: { leadDepartment: true },
    });

    return successResponse(res, updatedCompetition, '竞赛更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除竞赛
export const deleteCompetition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundError('竞赛不存在');
    }

    // 检查是否有关联的申报
    const applicationCount = await prisma.application.count({
      where: { competitionId: id },
    });

    if (applicationCount > 0) {
      throw new BadRequestError('该竞赛已有申报记录，无法删除');
    }

    await prisma.competition.delete({ where: { id } });

    return deletedResponse(res, '竞赛删除成功');
  } catch (error) {
    next(error);
  }
};

// 解析CSV/TSV行数据
const parseCSVRow = (content: string): string[][] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    // 尝试用制表符分隔，如果只有一列则用逗号分隔
    let cells = line.split('\t');
    if (cells.length === 1) {
      cells = line.split(',');
    }
    return cells.map(cell => cell.trim());
  });
};

// 批量导入竞赛（支持预览模式）
export const importCompetitions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new BadRequestError('请上传文件');
    }

    const userId = req.userId;
    const userRole = req.userRole;
    const filePath = req.file.path;
    const fileName = req.file.originalname.toLowerCase();
    const preview = req.query.preview === 'true'; // 预览模式

    const competitions: any[] = [];
    const errors: string[] = [];

    // 字段映射
    const regionMap: { [key: string]: Region } = {
      '国赛': 'NATIONAL',
      '省赛': 'PROVINCIAL',
      '校赛': 'SCHOOL',
    };

    const levelMap: { [key: string]: CompetitionLevel } = {
      'A': 'A',
      'B': 'B',
      'C': 'C',
      'D': 'D',
      'E': 'E',
    };

    // 根据文件类型选择解析方式
    const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt');
    const isXLS = fileName.endsWith('.xls') && !fileName.endsWith('.xlsx');
    
    let rows: string[][] = [];

    if (isCSV || isXLS) {
      // 读取CSV/TSV/XLS(文本格式)文件
      const content = fs.readFileSync(filePath, 'utf-8');
      // 移除BOM
      const cleanContent = content.replace(/^\uFEFF/, '');
      rows = parseCSVRow(cleanContent);
    } else {
      // 读取真正的Excel文件 (.xlsx)
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new BadRequestError('无法读取工作表');
      }

      worksheet.eachRow((row, _rowNumber) => {
        const rowData: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowData[colNumber - 1] = cell.value?.toString() || '';
        });
        rows.push(rowData);
      });
    }

    // 解析数据（跳过表头）
    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      if (rowNumber === 1) return; // 跳过表头

      // 列顺序：牵头院系(0), 年份(1), 届数(2), 赛名(3), 赛道(4), 区域(5), 等级(6), 排名(7), 是否需经费(8), 有效期(9)
      const name = row[3]?.trim(); // 赛名
      const level = row[6]?.trim()?.toUpperCase(); // 等级
      const region = row[5]?.trim(); // 区域
      const year = row[1]?.replace(/[^0-9]/g, ''); // 年份
      const session = row[2]?.trim(); // 届数
      const track = row[4]?.trim(); // 赛道
      const ranking = row[7]?.trim(); // 排名
      const requiresFunding = row[8]?.trim(); // 是否需经费
      const validUntil = row[9]?.trim(); // 有效期

      // 验证必填字段
      if (!name) {
        errors.push(`第${rowNumber}行：赛名不能为空`);
        return;
      }
      if (!level || !levelMap[level]) {
        errors.push(`第${rowNumber}行：等级无效，必须是A/B/C/D/E之一`);
        return;
      }

      // 权限检查：院级管理员不能导入A/B类
      if (['A', 'B'].includes(level) && userRole === 'DEPARTMENT_ADMIN') {
        errors.push(`第${rowNumber}行：A/B类竞赛只能由校级管理员导入`);
        return;
      }

      // 解析有效期
      let parsedValidUntil: Date | null = null;
      if (validUntil) {
        const dateMatch = validUntil.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
        if (dateMatch) {
          parsedValidUntil = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
        }
      }

      competitions.push({
        name,
        track: track || null,
        region: regionMap[region || '校赛'] || 'SCHOOL',
        level: levelMap[level],
        ranking: ['A', 'B'].includes(level) && ranking ? parseInt(ranking) : null,
        year: year ? parseInt(year) : new Date().getFullYear(),
        session: session || null,
        requiresFunding: requiresFunding === '是' || requiresFunding === 'true' || requiresFunding === '1',
        validUntil: parsedValidUntil,
        createdBy: userId,
      });
    });

    // 删除临时文件
    fs.unlinkSync(filePath);

    // 检查数据库中是否已存在相同的竞赛（按名称+年份+赛道判断重复）
    const existingCompetitions = await prisma.competition.findMany({
      where: {
        OR: competitions.map(c => ({
          AND: [
            { name: c.name },
            { year: c.year },
            { track: c.track || null },
          ],
        })),
      },
      select: { name: true, year: true, track: true },
    });

    // 创建已存在记录的键集合
    const existingKeys = new Set(
      existingCompetitions.map(c => `${c.name}_${c.year}_${c.track || ''}`)
    );

    // 过滤出新的竞赛和重复的竞赛
    const newCompetitions: typeof competitions = [];
    const duplicates: string[] = [];

    for (const comp of competitions) {
      const key = `${comp.name}_${comp.year}_${comp.track || ''}`;
      if (existingKeys.has(key)) {
        duplicates.push(`${comp.name} (${comp.year}年 ${comp.track || ''})`);
      } else {
        newCompetitions.push(comp);
        // 将新的也加入集合，避免同一批次内的重复
        existingKeys.add(key);
      }
    }

    // 预览模式：返回解析后的数据供确认
    if (preview) {
      if (duplicates.length > 0) {
        errors.push(...duplicates.map(d => `重复记录: ${d}`));
      }
      return successResponse(res, {
        preview: true,
        data: newCompetitions, // 只返回非重复的数据
        errors,
        total: competitions.length,
        newCount: newCompetitions.length,
        duplicateCount: duplicates.length,
        hasErrors: errors.length > 0,
      }, '预览数据');
    }

    if (errors.length > 0 && newCompetitions.length === 0) {
      return errorResponse(res, '导入数据存在错误或全部为重复记录', 400, errors);
    }

    if (newCompetitions.length === 0) {
      return successResponse(res, {
        imported: 0,
        total: competitions.length,
        duplicateCount: duplicates.length,
      }, '所有记录均为重复数据，未导入任何记录');
    }

    // 批量创建（只创建新的）
    const result = await prisma.competition.createMany({
      data: newCompetitions,
    });

    return successResponse(res, {
      imported: result.count,
      total: competitions.length,
      duplicateCount: duplicates.length,
    }, `成功导入${result.count}条竞赛数据${duplicates.length > 0 ? `，跳过${duplicates.length}条重复记录` : ''}`);
  } catch (error) {
    // 清理临时文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_e) {
        // 忽略删除失败
      }
    }
    next(error);
  }
};

// 确认导入竞赛（接收预览后的数据）
export const confirmImportCompetitions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { competitions } = req.body;

    if (!competitions || !Array.isArray(competitions) || competitions.length === 0) {
      throw new BadRequestError('没有要导入的数据');
    }

    // 再次检查数据库中是否已存在相同的竞赛（防止预览和确认之间有其他人导入）
    const existingCompetitions = await prisma.competition.findMany({
      where: {
        OR: competitions.map((c: any) => ({
          AND: [
            { name: c.name },
            { year: c.year },
            { track: c.track || null },
          ],
        })),
      },
      select: { name: true, year: true, track: true },
    });

    // 创建已存在记录的键集合
    const existingKeys = new Set(
      existingCompetitions.map(c => `${c.name}_${c.year}_${c.track || ''}`)
    );

    // 过滤出新的竞赛
    const newCompetitions = competitions.filter((comp: any) => {
      const key = `${comp.name}_${comp.year}_${comp.track || ''}`;
      if (existingKeys.has(key)) {
        return false;
      }
      existingKeys.add(key); // 避免同一批次内的重复
      return true;
    });

    if (newCompetitions.length === 0) {
      return successResponse(res, {
        imported: 0,
        total: competitions.length,
      }, '所有记录均为重复数据，未导入任何记录');
    }

    // 批量创建
    const result = await prisma.competition.createMany({
      data: newCompetitions,
    });

    return successResponse(res, {
      imported: result.count,
      total: competitions.length,
    }, `成功导入${result.count}条竞赛数据`);
  } catch (error) {
    next(error);
  }
};

// 获取竞赛修改日志
export const getCompetitionEditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const logs = await prisma.competitionEditLog.findMany({
      where: { competitionId: id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, logs);
  } catch (error) {
    next(error);
  }
};
