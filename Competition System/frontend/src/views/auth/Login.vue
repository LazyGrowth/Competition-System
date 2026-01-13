<template>
  <div class="login-page">
    <div class="login-bg"></div>
    
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <el-icon :size="48" color="#409eff"><Trophy /></el-icon>
          <h1>竞赛管理系统</h1>
          <p>Competition Management System</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="employeeId">
            <el-input
              v-model="form.employeeId"
              placeholder="请输入工号"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <p>默认账号：admin / admin123</p>
        </div>
      </div>

      <div class="login-info">
        <h2>系统功能</h2>
        <ul>
          <li><el-icon><Check /></el-icon> 竞赛信息导入与管理</li>
          <li><el-icon><Check /></el-icon> 教师申报与学生信息管理</li>
          <li><el-icon><Check /></el-icon> 多级审批流程</li>
          <li><el-icon><Check /></el-icon> 获奖记录与档案管理</li>
          <li><el-icon><Check /></el-icon> 绩效与工作量统计</li>
          <li><el-icon><Check /></el-icon> 年度奖励管理</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { User, Lock, Check } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  employeeId: '',
  password: '',
});

const rules: FormRules = {
  employeeId: [
    { required: true, message: '请输入工号', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
};

const handleLogin = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;
    try {
      await userStore.login(form.employeeId, form.password);
      ElMessage.success('登录成功');
      
      const redirect = route.query.redirect as string || '/dashboard';
      router.push(redirect);
    } catch (error) {
      // 错误已在请求拦截器中处理
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 50px,
      rgba(255, 255, 255, 0.03) 50px,
      rgba(255, 255, 255, 0.03) 100px
    );
    animation: move 30s linear infinite;
  }
}

@keyframes move {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100px);
  }
}

.login-container {
  display: flex;
  gap: 60px;
  z-index: 1;
  padding: 20px;
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  .login-header {
    text-align: center;
    margin-bottom: 40px;

    h1 {
      margin: 16px 0 8px;
      font-size: 24px;
      color: #333;
    }

    p {
      color: #999;
      font-size: 14px;
    }
  }

  .login-form {
    .login-btn {
      width: 100%;
      height: 48px;
      font-size: 16px;
      border-radius: 8px;
    }
  }

  .login-footer {
    margin-top: 20px;
    text-align: center;
    color: #999;
    font-size: 12px;
  }
}

.login-info {
  color: #fff;
  padding-top: 40px;

  h2 {
    font-size: 28px;
    margin-bottom: 24px;
    font-weight: 600;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      margin-bottom: 16px;
      opacity: 0.9;

      .el-icon {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        padding: 4px;
      }
    }
  }
}

@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    gap: 40px;
  }

  .login-info {
    display: none;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
  }
}
</style>
