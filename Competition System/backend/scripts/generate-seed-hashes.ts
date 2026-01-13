/**
 * 生成 seed.sql 中使用的密码哈希
 * 运行: npx ts-node scripts/generate-seed-hashes.ts
 */

import bcrypt from 'bcryptjs';

async function generateHashes() {
  const admin123Hash = await bcrypt.hash('admin123', 10);
  const password123456Hash = await bcrypt.hash('123456', 10);

  console.log('='.repeat(60));
  console.log('请将以下哈希值复制到 seed.sql 文件中：');
  console.log('='.repeat(60));
  console.log('');
  console.log('admin123 对应哈希:');
  console.log(admin123Hash);
  console.log('');
  console.log('123456 对应哈希:');
  console.log(password123456Hash);
  console.log('');
  console.log('='.repeat(60));
  
  // 输出完整的 SQL INSERT 语句
  console.log('\n完整的用户 INSERT 语句：\n');
  console.log(`INSERT INTO \`users\` (\`employee_id\`, \`password\`, \`name\`, \`gender\`, \`department_id\`, \`role\`) VALUES
('admin', '${admin123Hash}', '超级管理员', NULL, NULL, 'SUPER_ADMIN'),
('school001', '${password123456Hash}', '校级管理员', NULL, NULL, 'SCHOOL_ADMIN'),
('dept001', '${password123456Hash}', '院级管理员', '男', 1, 'DEPARTMENT_ADMIN'),
('teacher001', '${password123456Hash}', '张三', '男', 1, 'TEACHER'),
('teacher002', '${password123456Hash}', '李四', '女', 1, 'TEACHER'),
('teacher003', '${password123456Hash}', '王五', '男', 2, 'TEACHER');`);
}

generateHashes().catch(console.error);
