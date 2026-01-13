-- 竞赛管理系统数据库结构
-- MySQL 8.0+
-- 账户: root / 123456

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `competition_management` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `competition_management`;

-- ========================================
-- 1. 学院表
-- ========================================
CREATE TABLE `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '学院名称',
  `code` VARCHAR(20) NOT NULL COMMENT '学院代码',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_name_key` (`name`),
  UNIQUE KEY `departments_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学院表';

-- ========================================
-- 2. 用户表
-- ========================================
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employee_id` VARCHAR(50) NOT NULL COMMENT '工号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `gender` VARCHAR(10) DEFAULT NULL COMMENT '性别',
  `department_id` INT DEFAULT NULL COMMENT '所属学院ID',
  `bank_account` VARCHAR(255) DEFAULT NULL COMMENT '银行卡号(加密)',
  `bank_name` VARCHAR(100) DEFAULT NULL COMMENT '开户行',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱(超级管理员验证用)',
  `email_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '邮箱是否已验证',
  `role` ENUM('SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER') NOT NULL DEFAULT 'TEACHER' COMMENT '角色',
  `performance_score` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '绩效分',
  `monthly_edit_count` INT NOT NULL DEFAULT 0 COMMENT '本月修改次数',
  `last_edit_month` VARCHAR(7) DEFAULT NULL COMMENT '上次修改月份(YYYY-MM)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_employee_id_key` (`employee_id`),
  KEY `users_department_id_fkey` (`department_id`),
  CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ========================================
-- 3. 用户信息修改日志表
-- ========================================
CREATE TABLE `user_info_edit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `field_name` VARCHAR(50) NOT NULL COMMENT '字段名',
  `old_value` TEXT DEFAULT NULL COMMENT '旧值',
  `new_value` TEXT DEFAULT NULL COMMENT '新值',
  `penalty_score` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '扣除绩效分',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `user_info_edit_logs_user_id_fkey` (`user_id`),
  CONSTRAINT `user_info_edit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息修改日志';

-- ========================================
-- 4. 竞赛表
-- ========================================
CREATE TABLE `competitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL COMMENT '竞赛名称',
  `track` VARCHAR(100) DEFAULT NULL COMMENT '赛道',
  `region` ENUM('NATIONAL', 'PROVINCIAL', 'SCHOOL') NOT NULL COMMENT '区域(国赛/省赛/校赛)',
  `level` ENUM('A', 'B', 'C', 'D', 'E') NOT NULL COMMENT '竞赛等级',
  `ranking` INT DEFAULT NULL COMMENT '排名(仅A/B类)',
  `year` INT NOT NULL COMMENT '年份',
  `session` VARCHAR(50) DEFAULT NULL COMMENT '届数',
  `lead_department_id` INT DEFAULT NULL COMMENT '牵头院系ID',
  `valid_until` DATETIME(3) DEFAULT NULL COMMENT '有效期',
  `requires_funding` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要经费',
  `created_by` INT DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `competitions_lead_department_id_fkey` (`lead_department_id`),
  CONSTRAINT `competitions_lead_department_id_fkey` FOREIGN KEY (`lead_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞赛表';

-- ========================================
-- 5. 竞赛修改日志表
-- ========================================
CREATE TABLE `competition_edit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `competition_id` INT NOT NULL COMMENT '竞赛ID',
  `editor_id` INT NOT NULL COMMENT '编辑者ID',
  `field_name` VARCHAR(50) NOT NULL COMMENT '字段名',
  `old_value` TEXT DEFAULT NULL COMMENT '旧值',
  `new_value` TEXT DEFAULT NULL COMMENT '新值',
  `penalty_score` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '扣除绩效分',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `competition_edit_logs_competition_id_fkey` (`competition_id`),
  CONSTRAINT `competition_edit_logs_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competitions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞赛修改日志';

-- ========================================
-- 6. 学生表
-- ========================================
CREATE TABLE `students` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` VARCHAR(50) NOT NULL COMMENT '学号',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `department_id` INT DEFAULT NULL COMMENT '学院ID',
  `major` VARCHAR(100) DEFAULT NULL COMMENT '专业',
  `contact` VARCHAR(50) DEFAULT NULL COMMENT '联系方式',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_student_id_key` (`student_id`),
  KEY `students_department_id_fkey` (`department_id`),
  CONSTRAINT `students_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生表';

-- ========================================
-- 7. 申报表
-- ========================================
CREATE TABLE `applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `competition_id` INT NOT NULL COMMENT '竞赛ID',
  `teacher_id` INT NOT NULL COMMENT '主指导教师ID',
  `co_teacher_id` INT DEFAULT NULL COMMENT '第二指导教师ID',
  `status` ENUM('DRAFT', 'PENDING_DEPARTMENT', 'PENDING_SCHOOL', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED') NOT NULL DEFAULT 'DRAFT' COMMENT '状态',
  `submitted_at` DATETIME(3) DEFAULT NULL COMMENT '提交时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `applications_competition_id_fkey` (`competition_id`),
  KEY `applications_teacher_id_fkey` (`teacher_id`),
  KEY `applications_co_teacher_id_fkey` (`co_teacher_id`),
  CONSTRAINT `applications_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competitions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `applications_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `applications_co_teacher_id_fkey` FOREIGN KEY (`co_teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='申报表';

-- ========================================
-- 8. 申报-学生关联表
-- ========================================
CREATE TABLE `application_students` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `application_id` INT NOT NULL COMMENT '申报ID',
  `student_id` INT NOT NULL COMMENT '学生ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `application_students_application_id_student_id_key` (`application_id`, `student_id`),
  KEY `application_students_student_id_fkey` (`student_id`),
  CONSTRAINT `application_students_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `application_students_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='申报-学生关联表';

-- ========================================
-- 9. 审批记录表
-- ========================================
CREATE TABLE `approval_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `application_id` INT NOT NULL COMMENT '申报ID',
  `approver_id` INT NOT NULL COMMENT '审批人ID',
  `action` ENUM('APPROVE', 'REJECT', 'REQUEST_REVISION') NOT NULL COMMENT '审批动作',
  `comment` TEXT DEFAULT NULL COMMENT '审批意见',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `approval_records_application_id_fkey` (`application_id`),
  KEY `approval_records_approver_id_fkey` (`approver_id`),
  CONSTRAINT `approval_records_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `approval_records_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批记录表';

-- ========================================
-- 10. 获奖记录表
-- ========================================
CREATE TABLE `awards` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `application_id` INT NOT NULL COMMENT '申报ID',
  `award_level` ENUM('SPECIAL_PRIZE', 'FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'EXCELLENCE') NOT NULL COMMENT '获奖等级',
  `certificate_no` VARCHAR(50) NOT NULL COMMENT '证书编号',
  `summary_pdf` VARCHAR(500) DEFAULT NULL COMMENT '总结PDF路径',
  `performance_score` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '绩效分',
  `workload` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '工作量学时',
  `reward_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '奖励金额',
  `status` ENUM('PENDING_DEPARTMENT', 'PENDING_SCHOOL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_DEPARTMENT' COMMENT '状态',
  `approved_at` DATETIME(3) DEFAULT NULL COMMENT '通过时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `awards_application_id_key` (`application_id`),
  UNIQUE KEY `awards_certificate_no_key` (`certificate_no`),
  CONSTRAINT `awards_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='获奖记录表';

-- ========================================
-- 11. 获奖审批记录表
-- ========================================
CREATE TABLE `award_approval_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `award_id` INT NOT NULL COMMENT '获奖ID',
  `approver_id` INT NOT NULL COMMENT '审批人ID',
  `action` ENUM('APPROVE', 'REJECT', 'REQUEST_REVISION') NOT NULL COMMENT '审批动作',
  `comment` TEXT DEFAULT NULL COMMENT '审批意见',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `award_approval_records_award_id_fkey` (`award_id`),
  CONSTRAINT `award_approval_records_award_id_fkey` FOREIGN KEY (`award_id`) REFERENCES `awards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='获奖审批记录表';

-- ========================================
-- 12. 绩效规则表
-- ========================================
CREATE TABLE `performance_rules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `competition_level` ENUM('A', 'B', 'C', 'D', 'E') NOT NULL COMMENT '竞赛等级',
  `award_level` ENUM('SPECIAL_PRIZE', 'FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'EXCELLENCE') NOT NULL COMMENT '获奖等级',
  `performance_score` DECIMAL(10,2) NOT NULL COMMENT '绩效分',
  `workload` DECIMAL(10,2) NOT NULL COMMENT '工作量学时',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `performance_rules_competition_level_award_level_key` (`competition_level`, `award_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绩效规则表';

-- ========================================
-- 13. 奖励规则表
-- ========================================
CREATE TABLE `reward_rules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `competition_level` ENUM('A', 'B', 'C', 'D', 'E') NOT NULL COMMENT '竞赛等级',
  `award_level` ENUM('SPECIAL_PRIZE', 'FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'EXCELLENCE') NOT NULL COMMENT '获奖等级',
  `reward_amount` DECIMAL(10,2) NOT NULL COMMENT '奖励金额',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reward_rules_competition_level_award_level_key` (`competition_level`, `award_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='奖励规则表';

-- ========================================
-- 14. 系统配置表
-- ========================================
CREATE TABLE `system_configs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `value` TEXT NOT NULL COMMENT '配置值',
  `comment` VARCHAR(255) DEFAULT NULL COMMENT '说明',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_configs_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ========================================
-- 15. 操作日志表
-- ========================================
CREATE TABLE `operation_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL COMMENT '用户ID',
  `action` VARCHAR(255) NOT NULL COMMENT '操作',
  `details` TEXT DEFAULT NULL COMMENT '详情(JSON)',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `operation_logs_user_id_fkey` (`user_id`),
  CONSTRAINT `operation_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ========================================
-- 16. 数据备份记录表
-- ========================================
CREATE TABLE `backup_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `filename` VARCHAR(255) NOT NULL COMMENT '文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
  `file_size` BIGINT NOT NULL COMMENT '文件大小(字节)',
  `created_by` INT NOT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据备份记录表';
