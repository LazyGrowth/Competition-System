/**
 * 修复用户密码脚本
 * 运行: npx ts-node scripts/fix-passwords.ts
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPasswords() {
  console.log('开始修复用户密码...\n');

  // 定义用户密码
  const users = [
    { employeeId: 'admin', password: 'admin123' },
    { employeeId: 'school001', password: '123456' },
    { employeeId: 'dept001', password: '123456' },
    { employeeId: 'teacher001', password: '123456' },
    { employeeId: 'teacher002', password: '123456' },
    { employeeId: 'teacher003', password: '123456' },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    try {
      await prisma.user.update({
        where: { employeeId: user.employeeId },
        data: { password: hashedPassword },
      });
      console.log(`✓ 用户 ${user.employeeId} 密码已更新 (${user.password})`);
    } catch (e) {
      console.log(`✗ 用户 ${user.employeeId} 不存在，跳过`);
    }
  }

  console.log('\n密码修复完成！');
  console.log('\n默认账户:');
  console.log('  admin / admin123 (超级管理员)');
  console.log('  school001 / 123456 (校级管理员)');
  console.log('  dept001 / 123456 (院级管理员)');
  console.log('  teacher001 / 123456 (教师)');

  await prisma.$disconnect();
}

fixPasswords().catch(console.error);
