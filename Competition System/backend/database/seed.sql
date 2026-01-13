-- 竞赛管理系统初始数据
-- 在执行 schema.sql 之后运行此脚本

USE `competition_management`;

-- ========================================
-- 1. 初始化学院数据
-- ========================================
INSERT INTO `departments` (`name`, `code`) VALUES
('计算机科学与技术学院', 'CS'),
('电子与电气工程学院', 'EE'),
('机械工程学院', 'ME'),
('数学与统计学院', 'MA'),
('商学院', 'BA');

-- ========================================
-- 2. 初始化用户数据
-- 密码使用bcrypt加密 (cost=10)
-- admin123 对应: $2a$10$I./aGMiUJsSt2R0nh82SMu7QUT7UzAQP9lGJ7b13DX4HAg0ddhFx.
-- 123456 对应: $2a$10$P/T916KVlSCIpuBwQfJRjOqYCCcgqLAQCU/BVr69hjv7Nm3O1XRCS
-- ========================================
INSERT INTO `users` (`employee_id`, `password`, `name`, `gender`, `department_id`, `role`) VALUES
('admin', '$2a$10$I./aGMiUJsSt2R0nh82SMu7QUT7UzAQP9lGJ7b13DX4HAg0ddhFx.', '超级管理员', NULL, NULL, 'SUPER_ADMIN'),
('school001', '$2a$10$P/T916KVlSCIpuBwQfJRjOqYCCcgqLAQCU/BVr69hjv7Nm3O1XRCS', '校级管理员', NULL, NULL, 'SCHOOL_ADMIN'),
('dept001', '$2a$10$P/T916KVlSCIpuBwQfJRjOqYCCcgqLAQCU/BVr69hjv7Nm3O1XRCS', '院级管理员', '男', 1, 'DEPARTMENT_ADMIN'),
('teacher001', '$2a$10$P/T916KVlSCIpuBwQfJRjOqYCCcgqLAQCU/BVr69hjv7Nm3O1XRCS', '张三', '男', 1, 'TEACHER'),
('teacher002', '$2a$10$P/T916KVlSCIpuBwQfJRjOqYCCcgqLAQCU/BVr69hjv7Nm3O1XRCS', '李四', '女', 1, 'TEACHER'),
('teacher003', '$2a$10$P/T916KVlSCIpuBwQfJRjOqYCCcgqLAQCU/BVr69hjv7Nm3O1XRCS', '王五', '男', 2, 'TEACHER');

-- ========================================
-- 3. 初始化绩效规则
-- ========================================
INSERT INTO `performance_rules` (`competition_level`, `award_level`, `performance_score`, `workload`) VALUES
-- A级竞赛
('A', 'SPECIAL_PRIZE', 25.00, 50.00),
('A', 'FIRST_PRIZE', 20.00, 40.00),
('A', 'SECOND_PRIZE', 15.00, 30.00),
('A', 'THIRD_PRIZE', 10.00, 20.00),
('A', 'EXCELLENCE', 5.00, 10.00),
-- B级竞赛
('B', 'SPECIAL_PRIZE', 20.00, 40.00),
('B', 'FIRST_PRIZE', 15.00, 30.00),
('B', 'SECOND_PRIZE', 10.00, 20.00),
('B', 'THIRD_PRIZE', 8.00, 15.00),
('B', 'EXCELLENCE', 4.00, 8.00),
-- C级竞赛
('C', 'SPECIAL_PRIZE', 15.00, 30.00),
('C', 'FIRST_PRIZE', 10.00, 20.00),
('C', 'SECOND_PRIZE', 6.00, 12.00),
('C', 'THIRD_PRIZE', 4.00, 8.00),
('C', 'EXCELLENCE', 2.00, 4.00),
-- D级竞赛
('D', 'SPECIAL_PRIZE', 10.00, 20.00),
('D', 'FIRST_PRIZE', 5.00, 10.00),
('D', 'SECOND_PRIZE', 3.00, 6.00),
('D', 'THIRD_PRIZE', 2.00, 4.00),
('D', 'EXCELLENCE', 1.00, 2.00),
-- E级竞赛
('E', 'SPECIAL_PRIZE', 5.00, 10.00),
('E', 'FIRST_PRIZE', 3.00, 6.00),
('E', 'SECOND_PRIZE', 2.00, 4.00),
('E', 'THIRD_PRIZE', 1.00, 2.00),
('E', 'EXCELLENCE', 0.50, 1.00);

-- ========================================
-- 4. 初始化奖励规则
-- ========================================
INSERT INTO `reward_rules` (`competition_level`, `award_level`, `reward_amount`) VALUES
-- A级竞赛
('A', 'SPECIAL_PRIZE', 10000.00),
('A', 'FIRST_PRIZE', 8000.00),
('A', 'SECOND_PRIZE', 5000.00),
('A', 'THIRD_PRIZE', 3000.00),
('A', 'EXCELLENCE', 1000.00),
-- B级竞赛
('B', 'SPECIAL_PRIZE', 5000.00),
('B', 'FIRST_PRIZE', 3000.00),
('B', 'SECOND_PRIZE', 2000.00),
('B', 'THIRD_PRIZE', 1000.00),
('B', 'EXCELLENCE', 500.00),
-- C级竞赛
('C', 'SPECIAL_PRIZE', 2000.00),
('C', 'FIRST_PRIZE', 1500.00),
('C', 'SECOND_PRIZE', 1000.00),
('C', 'THIRD_PRIZE', 500.00),
('C', 'EXCELLENCE', 200.00),
-- D级竞赛
('D', 'SPECIAL_PRIZE', 1000.00),
('D', 'FIRST_PRIZE', 500.00),
('D', 'SECOND_PRIZE', 300.00),
('D', 'THIRD_PRIZE', 200.00),
('D', 'EXCELLENCE', 100.00),
-- E级竞赛
('E', 'SPECIAL_PRIZE', 500.00),
('E', 'FIRST_PRIZE', 300.00),
('E', 'SECOND_PRIZE', 200.00),
('E', 'THIRD_PRIZE', 100.00),
('E', 'EXCELLENCE', 50.00);

-- ========================================
-- 5. 初始化示例竞赛
-- ========================================
INSERT INTO `competitions` (`name`, `track`, `region`, `level`, `ranking`, `year`, `session`, `lead_department_id`) VALUES
('全国大学生电子设计竞赛', '本科组', 'NATIONAL', 'A', 1, 2026, '第18届', 2),
('中国大学生程序设计竞赛', 'CCPC', 'NATIONAL', 'A', 5, 2026, '第11届', 1),
('全国大学生数学建模竞赛', '本科组', 'NATIONAL', 'A', 2, 2026, '第35届', 4),
('"挑战杯"全国大学生课外学术科技作品竞赛', '主赛道', 'NATIONAL', 'A', 3, 2026, '第19届', 1),
('全国大学生机械创新设计大赛', '主赛道', 'NATIONAL', 'B', 15, 2026, '第11届', 3),
('全国大学生广告艺术大赛', '平面设计', 'NATIONAL', 'B', 20, 2026, '第15届', 5),
('省大学生程序设计竞赛', '本科组', 'PROVINCIAL', 'C', NULL, 2026, '第12届', 1),
('省大学生电子商务竞赛', '创业组', 'PROVINCIAL', 'C', NULL, 2026, '第8届', 5),
('校程序设计新生赛', '新生组', 'SCHOOL', 'E', NULL, 2026, '第10届', 1);

-- ========================================
-- 6. 初始化系统配置
-- ========================================
INSERT INTO `system_configs` (`key`, `value`, `comment`) VALUES
('info_modify_penalty', '1', '教师信息修改扣分值'),
('competition_modify_penalty', '2', '竞赛信息修改扣分值'),
('monthly_free_edits', '1', '每月免费修改次数'),
('session_timeout', '1800', '会话超时时间（秒）'),
('history_import_enabled', 'true', '是否开启历史数据导入'),
('award_display_count', '20', '首页获奖展示数量'),
('backup_retention_days', '30', '备份保留天数');

-- ========================================
-- 7. 初始化示例学生
-- ========================================
INSERT INTO `students` (`student_id`, `name`, `department_id`, `major`, `contact`) VALUES
('2022001001', '小明', 1, '计算机科学与技术', '13800000001'),
('2022001002', '小红', 1, '软件工程', '13800000002'),
('2022001003', '小刚', 1, '人工智能', '13800000003'),
('2022002001', '小华', 2, '电子信息工程', '13800000004'),
('2022002002', '小丽', 2, '通信工程', '13800000005');

-- ========================================
-- 完成提示
-- ========================================
SELECT '初始数据导入完成！' AS message;
SELECT '默认账号：' AS info;
SELECT 'admin / admin123 (超级管理员)' AS account
UNION ALL SELECT 'school001 / 123456 (校级管理员)'
UNION ALL SELECT 'dept001 / 123456 (院级管理员)'
UNION ALL SELECT 'teacher001 / 123456 (教师)';
