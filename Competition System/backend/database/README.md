# 数据库配置说明

## 环境要求

- MySQL 8.0+ (使用 phpStudy 提供的 MySQL)
- 账户: `root`
- 密码: `123456`

## 文件说明

| 文件 | 说明 |
|------|------|
| `schema.sql` | 数据库表结构定义 |
| `seed.sql` | 初始数据（学院、用户、绩效规则等） |
| `setup.bat` | Windows 一键初始化脚本 |

## 快速初始化

### 方法一：使用批处理脚本（推荐）

1. 确保 phpStudy 的 MySQL 8 服务已启动
2. 双击运行 `setup.bat`
3. 按提示操作即可

### 方法二：手动执行 SQL

在 phpMyAdmin 或 MySQL 命令行中依次执行：

```bash
# 1. 执行表结构
mysql -u root -p123456 < schema.sql

# 2. 执行初始数据
mysql -u root -p123456 < seed.sql
```

### 方法三：使用 Prisma

在 `backend` 目录下执行：

```bash
# 生成 Prisma Client
npm run prisma:generate

# 执行迁移
npm run prisma:migrate

# 导入种子数据
npx ts-node prisma/seed.ts
```

## 后端环境配置

在 `backend` 目录下创建 `.env` 文件：

```env
# 数据库配置 (phpStudy MySQL 8)
DATABASE_URL="mysql://root:123456@localhost:3306/competition_management"

# JWT配置
JWT_SECRET="competition-management-jwt-secret-2026"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3000
NODE_ENV=development

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## 默认账户

| 角色 | 工号 | 密码 | 说明 |
|------|------|------|------|
| 超级管理员 | admin | admin123 | 系统最高权限 |
| 校级管理员 | school001 | 123456 | 校级审批权限 |
| 院级管理员 | dept001 | 123456 | 院级审批权限 |
| 教师 | teacher001 | 123456 | 普通教师账户 |
| 教师 | teacher002 | 123456 | 普通教师账户 |
| 教师 | teacher003 | 123456 | 普通教师账户 |

## 数据库表一览

| 表名 | 说明 |
|------|------|
| `departments` | 学院 |
| `users` | 用户 |
| `user_info_edit_logs` | 用户信息修改日志 |
| `competitions` | 竞赛 |
| `competition_edit_logs` | 竞赛修改日志 |
| `students` | 学生 |
| `applications` | 申报 |
| `application_students` | 申报-学生关联 |
| `approval_records` | 审批记录 |
| `awards` | 获奖记录 |
| `award_approval_records` | 获奖审批记录 |
| `performance_rules` | 绩效规则 |
| `reward_rules` | 奖励规则 |
| `system_configs` | 系统配置 |
| `operation_logs` | 操作日志 |
| `backup_records` | 备份记录 |
