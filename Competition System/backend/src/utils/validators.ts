import { body, query, param } from 'express-validator';

// 登录验证
export const loginValidation = [
  body('employeeId')
    .notEmpty()
    .withMessage('工号不能为空')
    .isLength({ min: 1, max: 50 })
    .withMessage('工号长度应在1-50个字符之间'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度应在6-100个字符之间'),
];

// 竞赛创建验证
export const competitionValidation = [
  body('name')
    .notEmpty()
    .withMessage('竞赛名称不能为空')
    .isLength({ max: 200 })
    .withMessage('竞赛名称不能超过200个字符'),
  body('level')
    .notEmpty()
    .withMessage('竞赛等级不能为空')
    .isIn(['A', 'B', 'C', 'D', 'E'])
    .withMessage('竞赛等级必须是A/B/C/D/E之一'),
  body('year')
    .notEmpty()
    .withMessage('年份不能为空')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('年份必须在2000-2100之间'),
  body('region')
    .notEmpty()
    .withMessage('区域不能为空')
    .isIn(['国赛', '省赛', '校赛'])
    .withMessage('区域必须是国赛/省赛/校赛之一'),
];

// 申报创建验证
export const applicationValidation = [
  body('competitionId')
    .notEmpty()
    .withMessage('竞赛ID不能为空')
    .isInt()
    .withMessage('竞赛ID必须是整数'),
  body('studentIds')
    .isArray()
    .withMessage('学生ID列表必须是数组'),
];

// 审批操作验证
export const approvalValidation = [
  body('action')
    .notEmpty()
    .withMessage('审批动作不能为空')
    .isIn(['APPROVE', 'REJECT', 'REQUEST_REVISION'])
    .withMessage('审批动作无效'),
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('审批意见不能超过500个字符'),
];

// 分页查询验证
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
];

// ID参数验证
export const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是有效的正整数'),
];

// 用户信息更新验证
export const userUpdateValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度应在2-50个字符之间'),
  body('gender')
    .optional()
    .isIn(['男', '女'])
    .withMessage('性别必须是男或女'),
  body('bankAccount')
    .optional()
    .isLength({ max: 30 })
    .withMessage('银行卡号不能超过30个字符'),
  body('bankName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('开户行名称不能超过100个字符'),
];

// 获奖提交验证
export const awardValidation = [
  body('applicationId')
    .notEmpty()
    .withMessage('申报ID不能为空')
    .isInt()
    .withMessage('申报ID必须是整数'),
  body('awardLevel')
    .notEmpty()
    .withMessage('获奖等级不能为空')
    .isIn(['一等奖', '二等奖', '三等奖', '优秀奖', '特等奖'])
    .withMessage('获奖等级无效'),
  body('certificateNo')
    .notEmpty()
    .withMessage('证书编号不能为空')
    .isLength({ max: 50 })
    .withMessage('证书编号不能超过50个字符'),
];
