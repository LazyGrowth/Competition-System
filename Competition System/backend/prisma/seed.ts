import { PrismaClient, Role, CompetitionLevel, AwardLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 创建学院
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CS' },
      update: {},
      create: { name: '计算机科学与技术学院', code: 'CS' },
    }),
    prisma.department.upsert({
      where: { code: 'EE' },
      update: {},
      create: { name: '电子与电气工程学院', code: 'EE' },
    }),
    prisma.department.upsert({
      where: { code: 'ME' },
      update: {},
      create: { name: '机械工程学院', code: 'ME' },
    }),
    prisma.department.upsert({
      where: { code: 'MA' },
      update: {},
      create: { name: '数学与统计学院', code: 'MA' },
    }),
    prisma.department.upsert({
      where: { code: 'BA' },
      update: {},
      create: { name: '商学院', code: 'BA' },
    }),
  ]);

  console.log(`创建了 ${departments.length} 个学院`);

  // 密码哈希
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('123456', 10);

  // 创建超级管理员
  const superAdmin = await prisma.user.upsert({
    where: { employeeId: 'admin' },
    update: {},
    create: {
      employeeId: 'admin',
      password: adminPassword,
      name: '超级管理员',
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('创建超级管理员:', superAdmin.employeeId);

  // 创建校级管理员
  const schoolAdmin = await prisma.user.upsert({
    where: { employeeId: 'school001' },
    update: {},
    create: {
      employeeId: 'school001',
      password: userPassword,
      name: '校级管理员',
      role: Role.SCHOOL_ADMIN,
    },
  });
  console.log('创建校级管理员:', schoolAdmin.employeeId);

  // 创建院级管理员
  const deptAdmin = await prisma.user.upsert({
    where: { employeeId: 'dept001' },
    update: {},
    create: {
      employeeId: 'dept001',
      password: userPassword,
      name: '院级管理员',
      gender: '男',
      role: Role.DEPARTMENT_ADMIN,
      departmentId: departments[0].id,
    },
  });
  console.log('创建院级管理员:', deptAdmin.employeeId);

  // 创建教师
  const teachers = await Promise.all([
    prisma.user.upsert({
      where: { employeeId: 'teacher001' },
      update: {},
      create: {
        employeeId: 'teacher001',
        password: userPassword,
        name: '张三',
        gender: '男',
        role: Role.TEACHER,
        departmentId: departments[0].id,
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'teacher002' },
      update: {},
      create: {
        employeeId: 'teacher002',
        password: userPassword,
        name: '李四',
        gender: '女',
        role: Role.TEACHER,
        departmentId: departments[0].id,
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'teacher003' },
      update: {},
      create: {
        employeeId: 'teacher003',
        password: userPassword,
        name: '王五',
        gender: '男',
        role: Role.TEACHER,
        departmentId: departments[1].id,
      },
    }),
  ]);
  console.log(`创建了 ${teachers.length} 个教师账户`);

  // 创建绩效规则
  const performanceRules = [
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'SPECIAL_PRIZE' as AwardLevel, performanceScore: 25, workload: 50 },
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, performanceScore: 20, workload: 40 },
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'SECOND_PRIZE' as AwardLevel, performanceScore: 15, workload: 30 },
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'THIRD_PRIZE' as AwardLevel, performanceScore: 10, workload: 20 },
    { competitionLevel: 'B' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, performanceScore: 15, workload: 30 },
    { competitionLevel: 'B' as CompetitionLevel, awardLevel: 'SECOND_PRIZE' as AwardLevel, performanceScore: 10, workload: 20 },
    { competitionLevel: 'B' as CompetitionLevel, awardLevel: 'THIRD_PRIZE' as AwardLevel, performanceScore: 8, workload: 15 },
    { competitionLevel: 'C' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, performanceScore: 10, workload: 20 },
    { competitionLevel: 'C' as CompetitionLevel, awardLevel: 'SECOND_PRIZE' as AwardLevel, performanceScore: 6, workload: 12 },
    { competitionLevel: 'D' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, performanceScore: 5, workload: 10 },
  ];

  for (const rule of performanceRules) {
    await prisma.performanceRule.upsert({
      where: {
        competitionLevel_awardLevel: {
          competitionLevel: rule.competitionLevel,
          awardLevel: rule.awardLevel,
        },
      },
      update: rule,
      create: rule,
    });
  }
  console.log(`创建了 ${performanceRules.length} 条绩效规则`);

  // 创建奖励规则
  const rewardRules = [
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'SPECIAL_PRIZE' as AwardLevel, rewardAmount: 8000 },
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, rewardAmount: 5000 },
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'SECOND_PRIZE' as AwardLevel, rewardAmount: 3000 },
    { competitionLevel: 'A' as CompetitionLevel, awardLevel: 'THIRD_PRIZE' as AwardLevel, rewardAmount: 2000 },
    { competitionLevel: 'B' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, rewardAmount: 3000 },
    { competitionLevel: 'B' as CompetitionLevel, awardLevel: 'SECOND_PRIZE' as AwardLevel, rewardAmount: 2000 },
    { competitionLevel: 'B' as CompetitionLevel, awardLevel: 'THIRD_PRIZE' as AwardLevel, rewardAmount: 1000 },
    { competitionLevel: 'C' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, rewardAmount: 1500 },
    { competitionLevel: 'C' as CompetitionLevel, awardLevel: 'SECOND_PRIZE' as AwardLevel, rewardAmount: 1000 },
    { competitionLevel: 'D' as CompetitionLevel, awardLevel: 'FIRST_PRIZE' as AwardLevel, rewardAmount: 500 },
  ];

  for (const rule of rewardRules) {
    await prisma.rewardRule.upsert({
      where: {
        competitionLevel_awardLevel: {
          competitionLevel: rule.competitionLevel,
          awardLevel: rule.awardLevel,
        },
      },
      update: rule,
      create: rule,
    });
  }
  console.log(`创建了 ${rewardRules.length} 条奖励规则`);

  // 创建示例竞赛
  const competitions = await Promise.all([
    prisma.competition.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: '全国大学生电子设计竞赛',
        track: '本科组',
        region: 'NATIONAL',
        level: 'A',
        ranking: 1,
        year: 2026,
        session: '第18届',
        leadDepartmentId: departments[1].id,
      },
    }),
    prisma.competition.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: '中国大学生程序设计竞赛',
        track: 'CCPC',
        region: 'NATIONAL',
        level: 'A',
        ranking: 5,
        year: 2026,
        session: '第11届',
        leadDepartmentId: departments[0].id,
      },
    }),
    prisma.competition.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: '全国大学生数学建模竞赛',
        track: '本科组',
        region: 'NATIONAL',
        level: 'A',
        ranking: 2,
        year: 2026,
        session: '第35届',
        leadDepartmentId: departments[3].id,
      },
    }),
  ]);
  console.log(`创建了 ${competitions.length} 个示例竞赛`);

  // 创建示例学生
  const students = await Promise.all([
    prisma.student.upsert({
      where: { studentId: '2022001001' },
      update: {},
      create: { studentId: '2022001001', name: '小明', departmentId: departments[0].id, major: '计算机科学与技术', contact: '13800000001' },
    }),
    prisma.student.upsert({
      where: { studentId: '2022001002' },
      update: {},
      create: { studentId: '2022001002', name: '小红', departmentId: departments[0].id, major: '软件工程', contact: '13800000002' },
    }),
    prisma.student.upsert({
      where: { studentId: '2022001003' },
      update: {},
      create: { studentId: '2022001003', name: '小刚', departmentId: departments[0].id, major: '人工智能', contact: '13800000003' },
    }),
  ]);
  console.log(`创建了 ${students.length} 个示例学生`);

  // 创建系统配置
  const configs = [
    { key: 'info_modify_penalty', value: '1', comment: '教师信息修改扣分值' },
    { key: 'competition_modify_penalty', value: '2', comment: '竞赛信息修改扣分值' },
    { key: 'monthly_free_edits', value: '1', comment: '每月免费修改次数' },
    { key: 'session_timeout', value: '1800', comment: '会话超时时间（秒）' },
    { key: 'history_import_enabled', value: 'true', comment: '是否开启历史数据导入' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config,
    });
  }
  console.log(`创建了 ${configs.length} 条系统配置`);

  console.log('数据初始化完成！');
  console.log('\n默认账号:');
  console.log('  超级管理员: admin / admin123');
  console.log('  校级管理员: school001 / 123456');
  console.log('  院级管理员: dept001 / 123456');
  console.log('  教师: teacher001 / 123456');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
