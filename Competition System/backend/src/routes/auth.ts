import { Router } from 'express';
import { login, logout, getProfile, changePassword } from '../controllers/authController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { loginValidation } from '../utils/validators';

const router = Router();

// 用户登录
router.post('/login', loginValidation, login);

// 用户登出（可选认证，用于记录登出日志）
router.post('/logout', optionalAuthenticate, logout);

// 获取当前用户信息
router.get('/profile', authenticate, getProfile);

// 修改密码
router.put('/password', authenticate, changePassword);

export default router;
